import type { BroadcastOperator, Server, Socket } from "socket.io"
import type { DefaultEventsMap } from "socket.io/dist/typed-events"
import type { MediaSourceAny } from "../types/mediaSource"
import type { PlayContentArg, RoomState } from "../types/room"
import { resolveContent } from "./content"

import debug from "debug"
import { average } from "./util"
const log = debug("w2g:room")

const rooms: Record<string, Room> = {}
interface Member {
  name: string
  client: Socket
}

type Callback = (...x: any) => any

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

  private notify(event: string, client: Socket) {
    const { id } = client
    this.broadcast.emit("notifiy", { event, id })
  }

  get state(): RoomState {
    return {
      paused: this.paused,
      source: this.source,
      lastSeekedTo: this.lastSeekedTo,
    }
  }
  join(client: Socket) {
    this.log(`client ${client.id} joined room ${this.roomID}`)

    // TODO set name
    this.members[client.id] = { client, name: "undefined" }
    client.join(this.roomID)
    client.on("disconnect", () => this.leave(client))
  }

  leave(client: Socket) {
    this.log(`client ${client.id} left room ${this.roomID}`)

    client.leave(this.roomID)
    delete this.members[client.id]

    this.log(`member amount: ${Object.keys(this.members).length}`)
  }

  async playContent(client: Socket, source: string, startFrom: number) {
    this.log("playContent", source, "starting from", startFrom)

    this.source = await resolveContent(source, startFrom)
    this.lastSeekedTo = startFrom
    this.broadcast.emit("source", this.source)
    return this
  }

  pause(client: Socket) {
    this.log("pause")

    this.paused = true
    this.broadcast.emit("pause")
    return this
  }

  resume(client: Socket) {
    this.log("resume")

    this.paused = false
    this.broadcast.emit("resume")
    return this
  }

  seekTo(client: Socket, seconds: number) {
    this.log(`seekTo ${seconds}`)

    this.lastSeekedTo = seconds
    this.broadcast.emit("seekTo", seconds)
    return this
  }

  async requestTime(client: Socket, cb: Callback) {
    const requestTimeLog = this.log.extend("requestTime")
    requestTimeLog("requested time")

    const sockets = await this.broadcast.allSockets()
    const otherClients = [...sockets].filter(s => s !== client.id)

    const getTime = (sock: Socket): Promise<number> =>
      new Promise(res => sock.emit("requestTime", res))

    const times = []

    for (const id of otherClients) {
      if (!this.members[id])
        return requestTimeLog.extend("error")(`id ${id} not found in clients`)

      const time = await getTime(this.members[id].client)
      requestTimeLog(`id ${id} time ${time}`)
      times.push(time)
    }

    const avg = average(...times)

    requestTimeLog("times", times, "avg", avg)

    cb(avg)
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
      room.join(client)

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
    client.on("requestTime", ({ roomID }, cb) => {
      getRoom(roomID).requestTime(client, cb)
    })
  })
}
