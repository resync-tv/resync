import type { BroadcastOperator, Server, Socket } from "socket.io"
import type { MediaSourceAny } from "$/mediaSource"
import type {
  BackendEmits,
  NotifyEvents,
  ResyncSocketBackend,
  RoomState,
  Member,
} from "$/room"
import { average } from "./util"
import { customAlphabet } from "nanoid"
import { nolookalikesSafe } from "nanoid-dictionary"

const nanoid = customAlphabet(nolookalikesSafe, 6)

import { resolveContent } from "./content"

import debug from "debug"
const log = debug("resync:room")

const rooms: Record<string, Room> = {}
const getNewRandom = () => {
  let id = nanoid()
  while (rooms[id]) id = nanoid()

  return id
}

interface PlaybackErrorArg {
  client: Socket
  reason: string
  name: string
}

class Room {
  readonly roomID: string
  private io: ResyncSocketBackend
  private log: debug.Debugger
  readonly broadcast: BroadcastOperator<BackendEmits>

  public members: Array<Member> = []

  private paused = true
  private lastSeekedTo = 0
  private source: MediaSourceAny | undefined
  private membersLoading = 0

  constructor(roomID: string, io: Server) {
    log(`constructing room ${roomID}`)

    this.roomID = roomID
    this.io = io
    this.broadcast = this.io.to(roomID)
    this.log = log.extend(roomID)
  }

  private notify(event: NotifyEvents, client: Socket, additional?: any) {
    const { id } = client
    let name = id

    const member = this.getMember(id)
    if (member) name = member.name

    const notification = {
      event,
      id,
      name,
      additional,
      key: nanoid(),
    }
    this.broadcast.emit("notifiy", notification)
    this.log(`[${event}](${name})`, additional || "")
  }

  get state(): RoomState {
    return {
      paused: this.paused,
      source: this.source,
      lastSeekedTo: this.lastSeekedTo,
      members: this.members.map(({ client: { id }, name }) => ({ id, name })),
    }
  }

  getMember = (id: string) => this.members.find(m => m.client.id === id)
  removeMember = (id: string) => (this.members = this.members.filter(m => m.client.id !== id))

  updateState() {
    this.broadcast.emit("state", this.state)
  }

  join(client: Socket, name: string) {
    this.members.push({ client, name })
    client.join(this.roomID)

    client.on("disconnect", () => this.leave(client))

    this.updateState()
    this.notify("join", client)
  }

  leave(client: Socket) {
    this.notify("leave", client)

    client.leave(this.roomID)
    this.removeMember(client.id)

    const memberAmount = Object.keys(this.members).length
    if (memberAmount <= 0) this.paused = true

    this.updateState()
  }

  async playContent(client: Socket, source: string, startFrom: number) {
    this.source = source ? await resolveContent(source, startFrom) : undefined
    this.membersLoading = this.members.length
    this.lastSeekedTo = startFrom
    this.paused = true
    this.broadcast.emit("source", this.source)
    // this.resume()

    console.log(this.state)
    this.updateState()
    this.notify("playContent", client, { source, startFrom })
  }

  async loaded() {
    this.membersLoading--

    if (this.membersLoading <= 0) this.resume()
    this.log(`members loading: ${this.membersLoading}`)
  }

  pause(seconds?: number, client?: Socket) {
    this.paused = true
    this.broadcast.emit("pause")

    if (seconds) this.seekTo({ seconds })

    this.updateState()
    if (client) this.notify("pause", client)
  }

  resume(client?: Socket) {
    this.paused = false
    this.broadcast.emit("resume")

    this.updateState()
    if (client) this.notify("resume", client)
  }

  seekTo({ client, seconds }: { client?: Socket; seconds: number }) {
    this.lastSeekedTo = seconds
    this.broadcast.emit("seekTo", seconds)

    this.updateState()
    if (client) this.notify("seekTo", client, { seconds })
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
      const member = this.getMember(id)
      if (!member) {
        requestTimeLog.extend("error")(`id ${id} not found in clients`)
        continue
      }

      const time = await getTime(member.client)
      requestTimeLog(`${id} responded with time ${time}`)
      times.push(time)
    }

    const avg = average(...times)

    requestTimeLog("times", times, "avg", avg)

    return avg
  }

  async resync(client: Socket) {
    this.pause()

    const avg = await this.requestTime(client)
    this.seekTo({ seconds: avg })
    this.resume()

    this.updateState()
    this.notify("resync", client)
  }

  playbackError({ client, reason, name }: PlaybackErrorArg, seconds: number) {
    this.notify("playbackError", client, { reason, name })
    this.pause()
    this.seekTo({ seconds })
    this.updateState()
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
      getRoom(roomID).playContent(client, source, startFrom)
    })

    client.on("loaded", ({ roomID }) => getRoom(roomID).loaded())

    client.on("pause", ({ roomID, currentTime }) => {
      getRoom(roomID).pause(currentTime, client)
    })

    client.on("resume", ({ roomID }) => {
      getRoom(roomID).resume(client)
    })

    client.on("seekTo", ({ roomID, currentTime }) => {
      getRoom(roomID).seekTo({ client, seconds: currentTime })
    })

    client.on("resync", ({ roomID }) => getRoom(roomID).resync(client))

    client.on("playbackError", ({ roomID, reason, currentTime, name }) => {
      getRoom(roomID).playbackError({ client, reason, name }, currentTime)
    })

    client.on("getNewRandom", reply => reply(getNewRandom()))
  })
}
