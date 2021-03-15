import type { BroadcastOperator, Server, Socket } from "socket.io"
import type { DefaultEventsMap } from "socket.io/dist/typed-events"
import type { MediaSourceAny } from "../types/mediaSource"
import type { PlayContentArg, RoomArg, RoomState } from "../types/room"
import { resolveContent } from "./content"

import debug from "debug"
const log = debug("w2g:room")

const rooms: Record<string, Room> = {}

class Room {
  readonly roomID: string
  private io: Server
  private log: debug.Debugger
  readonly broadcast: BroadcastOperator<DefaultEventsMap>
  public members: Record<string, Socket> = {}

  private paused = true
  private source: MediaSourceAny | undefined

  constructor(roomID: string, io: Server) {
    log(`constructing room ${roomID}`)

    this.roomID = roomID
    this.io = io
    this.broadcast = this.io.to(roomID)
    this.log = log.extend(roomID)
  }

  leave(client: Socket) {
    this.log(`client ${client.id} left room ${this.roomID}`)

    client.leave(this.roomID)
    delete this.members[client.id]
  }
  join(client: Socket) {
    this.log(`client ${client.id} joined room ${this.roomID}`)

    this.members[client.id] = client
    client.join(this.roomID)
    client.on("disconnect", () => this.leave(client))
  }

  get state(): RoomState {
    return {
      paused: this.paused,
      source: this.source,
    }
  }

  async playContent(source: string, startFrom: number) {
    this.log("playContent", source, "starting from", startFrom)

    this.source = await resolveContent(source, startFrom)
    this.broadcast.emit("source", this.source)
    return this
  }

  pause() {
    this.log("pause")

    this.paused = true
    this.broadcast.emit("pause")
    return this
  }

  resume() {
    this.log("resume")

    this.paused = false
    this.broadcast.emit("resume")
    return this
  }

  seekTo(seconds: number) {
    this.log(`seekTo ${seconds}`)

    this.broadcast.emit("seekTo", seconds)
    return this
  }
}

export default (io: Server): void => {
  const getRoom = (roomID: string) => {
    if (!rooms[roomID]) rooms[roomID] = new Room(roomID, io)
    return rooms[roomID]
  }

  io.on("connect", client => {
    client.on("joinRoom", ({ roomID }: RoomArg, reply) => {
      const room = getRoom(roomID)
      room.join(client)

      reply(room.state)
    })

    client.on("leaveRoom", ({ roomID }: RoomArg) => getRoom(roomID).leave(client))

    client.on("playContent", ({ roomID, source, startFrom = 0 }: PlayContentArg) => {
      getRoom(roomID).playContent(source, startFrom)
    })

    client.on("pause", ({ roomID, currentTime }) =>
      getRoom(roomID).pause().seekTo(currentTime)
    )
    client.on("resume", ({ roomID }) => getRoom(roomID).resume())
    client.on("seekTo", ({ roomID, currentTime }) => getRoom(roomID).seekTo(currentTime))
  })
}
