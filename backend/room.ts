import type { BroadcastOperator, Server, Socket } from "socket.io"
import type { MediaSourceAny } from "../types/mediaSource"
import type { BackendEmits, NotifyEvents, ResyncSocketBackend, RoomState } from "../types/room"
import { resolveContent } from "./content"

import debug from "debug"
import { average } from "./util"
const log = debug("resync:room")

const rooms: Record<string, Room> = {}
interface Member {
  name: string
  client: Socket
}

class Room {
  readonly roomID: string
  private io: ResyncSocketBackend
  private log: debug.Debugger
  readonly broadcast: BroadcastOperator<BackendEmits>

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

  private notify(event: NotifyEvents, client: Socket, additional?: any) {
    this.updateState()

    const { id } = client
    let name = id
    if (this.members[id]) name = this.members[id].name

    this.broadcast.emit("notifiy", { event, id, name, additional })
    this.log(`[${event}](${name})`, additional || "")
  }

  get state(): RoomState {
    return {
      paused: this.paused,
      source: this.source,
      lastSeekedTo: this.lastSeekedTo,
      // TODO add room members
    }
  }

  updateState() {
    this.broadcast.emit("state", this.state)
  }

  join(client: Socket, name: string) {
    this.members[client.id] = { client, name }
    client.join(this.roomID)

    client.on("disconnect", () => this.leave(client))

    this.notify("join", client)
  }

  leave(client: Socket) {
    client.leave(this.roomID)
    delete this.members[client.id]

    const memberAmount = Object.keys(this.members).length
    if (memberAmount <= 0) this.paused = true

    this.notify("leave", client)
  }

  async playContent(client: Socket, source: string, startFrom: number) {
    this.source = source ? await resolveContent(source, startFrom) : undefined
    this.lastSeekedTo = startFrom
    this.broadcast.emit("source", this.source)

    this.notify("playContent", client, { source, startFrom })
    return this
  }

  pause(client?: Socket) {
    this.paused = true
    this.broadcast.emit("pause")

    if (client) this.notify("pause", client)
    return this
  }

  resume(client?: Socket) {
    this.paused = false
    this.broadcast.emit("resume")

    if (client) this.notify("resume", client)
    return this
  }

  seekTo({ client, seconds }: { client?: Socket; seconds: number }) {
    this.lastSeekedTo = seconds
    this.broadcast.emit("seekTo", seconds)

    if (client) this.notify("seekTo", client, { seconds })
    return this
  }

  async requestTime(client: Socket) {
    const requestTimeLog = this.log.extend("requestTime")
    requestTimeLog("requested time")

    const sockets = await this.broadcast.allSockets()
    // TODO https://socket.io/docs/v3/migrating-from-3-x-to-4-0/#Allow-excluding-specific-rooms-when-broadcasting
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
    this.pause(client)
    const avg = await this.requestTime(client)
    this.seekTo({ client, seconds: avg })
    this.resume(client)

    this.notify("resync", client)
  }

  playbackError({ client, reason, name }: { client: Socket; reason: string; name: string }) {
    this.notify("playbackError", client, { reason, name })

    return this
  }
}

export default (io: ResyncSocketBackend): void => {
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

    client.on("playContent", ({ roomID, source, startFrom = 0 }) => {
      getRoom(roomID)
        .playContent(client, source, startFrom)
        .then(t => t.resume())
    })

    client.on("pause", ({ roomID, currentTime }) => {
      getRoom(roomID).pause(client).seekTo({ seconds: currentTime })
    })

    client.on("resume", ({ roomID }) => {
      getRoom(roomID).resume(client)
    })

    client.on("seekTo", ({ roomID, currentTime }) => {
      getRoom(roomID).seekTo({ client, seconds: currentTime })
    })

    client.on("resync", ({ roomID }) => getRoom(roomID).resync(client))

    client.on("playbackError", ({ roomID, reason, currentTime, name }) => {
      getRoom(roomID)
        .playbackError({ client, reason, name })
        .pause()
        .seekTo({ seconds: currentTime })
    })
  })
}
