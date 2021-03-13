import type { BroadcastOperator, Server, Socket } from "socket.io"
import type { DefaultEventsMap } from "socket.io/dist/typed-events"
import type { MediaSourceAny } from "../types/mediaSource"
import type { RoomState } from "../types/room"

import { dev } from "./util"

const rooms: Record<string, Room> = {}

class Room {
  readonly roomID: string
  private io: Server
  readonly broadcast: BroadcastOperator<DefaultEventsMap>
  public members: Record<string, Socket> = {}

  private paused = true
  private source: MediaSourceAny | undefined

  constructor(roomID: string, io: Server) {
    dev.log(`constructing room ${roomID}`)

    this.roomID = roomID
    this.io = io
    this.broadcast = this.io.to(roomID)
  }

  leave(client: Socket) {
    dev.log(`client ${client.id} left room ${this.roomID}`)

    client.leave(this.roomID)
    delete this.members[client.id]
  }
  join(client: Socket) {
    dev.log(`client ${client.id} joined room ${this.roomID}`)

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
}

export default (io: Server): void => {
  io.on("connect", client => {
    client.on("joinRoom", ({ roomID }, reply) => {
      if (!rooms[roomID]) rooms[roomID] = new Room(roomID, io)

      rooms[roomID].join(client)

      reply(rooms[roomID].state)
    })

    client.on("leaveRoom", ({ roomID }) => {
      if (rooms[roomID]) rooms[roomID].leave(client)
    })
  })
}
