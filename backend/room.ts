import type { BroadcastOperator, Server, Socket } from "socket.io"
import type { DefaultEventsMap } from "socket.io/dist/typed-events"
import type { MediaSourceAny } from "../types/mediaSource"
import type { EventNotifiy, NotifiedEvents, PlayContentArg, RoomState } from "../types/room"
import { resolveContent } from "./content"

import debug from "debug"
import { average } from "./util"
const log = debug("w2g:room")

const rooms: Record<string, Room> = {}
interface Member {
  name: string
  client: Socket
}

class Room {
  readonly roomID: string
  private io: Server
  private log: debug.Debugger
  readonly broadcast: BroadcastOperator<DefaultEventsMap>
  public members: Record<string, Member> = {}

  private paused = true
  private lastSeekedTo = 0
  private source: MediaSourceAny | undefined

  constructor(roomID: string, io: Server) {
    log(`constructing room ${roomID}`)

    this.roomID = roomID
    this.io = io
    this.broadcast = this.io.to(roomID)
    this.log = log.extend(roomID)
  }

  private notify(event: NotifiedEvents, client: Socket, additional?: any) {
    const { id } = client
    let name = id
    if (this.members[id]) name = this.members[id].name

    const eventNotification: EventNotifiy = { event, id, name, additional }
    this.broadcast.emit("notifiy", eventNotification)
    this.log(`[${event}](${name})`, additional || "")
  }

  get state(): RoomState {
    return {
      paused: this.paused,
      source: this.source,
      lastSeekedTo: this.lastSeekedTo,
    }
  }
  join(client: Socket, name: string) {
    this.members[client.id] = { client, name }
    client.join(this.roomID)

    this.notify("join", client)

    client.on("disconnect", () => this.leave(client))
  }

  leave(client: Socket) {
    this.notify("leave", client)

    client.leave(this.roomID)
    delete this.members[client.id]

    const memberAmount = Object.keys(this.members).length
    if (memberAmount <= 0) this.paused = true
  }

  async playContent(client: Socket, source: string, startFrom: number) {
    this.notify("playContent", client, { source, startFrom })

    this.source = await resolveContent(source, startFrom)
    this.lastSeekedTo = startFrom
    this.broadcast.emit("source", this.source)
    return this
  }

  pause(client: Socket) {
    this.notify("pause", client)

    this.paused = true
    this.broadcast.emit("pause")
    return this
  }

  resume(client: Socket) {
    this.notify("resume", client)

    this.paused = false
    this.broadcast.emit("resume")
    return this
  }

  seekTo(client: Socket, seconds: number) {
    this.notify("seekTo", client, { seconds })

    this.lastSeekedTo = seconds
    this.broadcast.emit("seekTo", seconds)
    return this
  }

  async requestTime(client: Socket) {
    const requestTimeLog = this.log.extend("requestTime")
    requestTimeLog("requested time")

    const sockets = await this.broadcast.allSockets()
    const otherClients = [...sockets].filter(s => s !== client.id)

    const getTime = (sock: Socket): Promise<number> =>
      new Promise(res => sock.emit("requestTime", res))

    const times = []

    for (const id of otherClients) {
      if (!this.members[id]) {
        requestTimeLog.extend("error")(`id ${id} not found in clients`)
        continue
      }

      const time = await getTime(this.members[id].client)
      requestTimeLog(`${id} responded with time ${time}`)
      times.push(time)
    }

    const avg = average(...times)

    requestTimeLog("times", times, "avg", avg)

    return avg
  }

  async resync(client: Socket) {
    this.notify("resync", client)

    this.pause(client)
    const avg = await this.requestTime(client)
    this.seekTo(client, avg)
    this.resume(client)
  }
}

export default (io: Server): void => {
  const getRoom = (roomID: string) => {
    if (!rooms[roomID]) rooms[roomID] = new Room(roomID, io)
    return rooms[roomID]
  }

  io.on("connect", client => {
    client.on("joinRoom", ({ roomID, name }, reply) => {
      const room = getRoom(roomID)
      room.join(client, name)

      reply(room.state)
    })
    client.on("leaveRoom", ({ roomID }) => {
      getRoom(roomID).leave(client)
    })

    client.on("playContent", ({ roomID, source, startFrom = 0 }: PlayContentArg) => {
      getRoom(roomID).playContent(client, source, startFrom)
    })

    client.on("pause", ({ roomID, currentTime }) => {
      getRoom(roomID).pause(client).seekTo(client, currentTime)
    })
    client.on("resume", ({ roomID }) => {
      getRoom(roomID).resume(client)
    })

    client.on("seekTo", ({ roomID, currentTime }) => {
      getRoom(roomID).seekTo(client, currentTime)
    })

    client.on("resync", ({ roomID }) => getRoom(roomID).resync(client))
  })
}
