import type { BroadcastOperator, Server, Socket } from "socket.io"
import type { MediaSourceAny } from "$/mediaSource"
import type { NotifyEvents, RoomState, Member, EventNotification } from "$/room"
import type { BackendEmits, ResyncSocketBackend } from "$/socket"
import type { Category, Segment } from "sponsorblock-api"

import { SponsorBlock } from 'sponsorblock-api';
import { average } from "./util"
import { customAlphabet } from "nanoid"
import { nolookalikesSafe } from "nanoid-dictionary"

import { Permission } from "$/permissionTypes"
import { randomBytes } from "crypto"

const nanoid = customAlphabet(nolookalikesSafe, 6)

import { resolveContent } from "./content"

import debug from "debug"
import { clear } from "console"
const log = debug("resync:room")

const sponsorBlock = new SponsorBlock("resync-sponsorblock")
const allCategories : Category[] = ['sponsor' , 'intro' , 'outro' ,
'interaction' , 'selfpromo' , 'music_offtopic' , 'preview'] //todo: move this somewhere

const genSecret = () => randomBytes(256).toString("hex")

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
  private looping: boolean
  private hostSecret: string
  private defaultPermission: Permission
  readonly roomID: string
  private blockedCategories: Category[]
  private segmentTimeouts: NodeJS.Timeout[]
  private io: ResyncSocketBackend
  private log: debug.Debugger
  readonly broadcast: BroadcastOperator<BackendEmits>

  public members: Array<Member> = []

  paused = true
  lastSeekedTo = 0
  source: MediaSourceAny | undefined
  queue: Promise<MediaSourceAny>[] = []
  membersLoading = 0
  membersPlaying = 0

  constructor(roomID: string, io: Server, secret?: string) {
    log(`constructing room ${roomID}`)

    this.blockedCategories = allCategories
    this.segmentTimeouts = []
    this.looping = false
    this.hostSecret = secret ?? ""
    this.defaultPermission = 0 // Permission.QueueControl | Permission.PlayerControl
    this.roomID = roomID
    this.io = io
    this.broadcast = this.io.to(roomID)
    this.log = log.extend(roomID)
  }

  private hasPermission(requiredPermission: Permission, id?: string, secret?: string) {
    const isHost = this.hostSecret === secret
    if (isHost) return true

    let member: Member | undefined
    if (id) member = this.getMember(id)

    if (member) {
      return requiredPermission === (member?.permission & requiredPermission)
    }
  }

  private notify(event: NotifyEvents, client: Socket, additional?: any) {
    const { id } = client
    let name = id

    const member = this.getMember(id)
    if (member) name = member.name

    const notification: EventNotification = {
      event,
      id,
      name,
      additional,
      key: nanoid(),
    }
    this.broadcast.emit("notifiy", notification)
    this.log(`[${event}](${name})`, additional || "")
  }

  grantPermission(secret: string, id: string, permission: Permission) {
    if (this.hostSecret !== secret) return

    const member = this.getMember(id)

    if (member && (member?.permission & permission) !== permission) {
      member.permission ^= permission
    }

    this.updateState()
  }

  revokePermission(secret: string, id: string, permission: Permission) {
    if (this.hostSecret !== secret) return

    const member = this.getMember(id)

    if (member && (member?.permission & permission) === permission) {
      member.permission ^= permission
    }

    this.updateState()
  }

  message(msg: string, client: Socket) {
    const { id } = client
    let name = id

    const member = this.getMember(id)
    if (member) name = member.name

    const msgObj = {
      name,
      msg,
      key: nanoid(),
    }

    this.broadcast.emit("message", msgObj)
  }

  get state(): Promise<RoomState> {
    return (async () => {
      return {
        looping: this.looping,
        paused: this.paused,
        source: this.source,
        lastSeekedTo: this.lastSeekedTo,
        members: this.members.map(({ client, name, permission }) => ({
          id: client.id,
          permission,
          name,
        })),
        membersLoading: this.membersLoading,
        queue: await Promise.all(this.queue),
      }
    })()
  }

  getMember = (id: string) => this.members.find(m => m.client.id === id)
  removeMember = (id: string) => (this.members = this.members.filter(m => m.client.id !== id))

  async updateState() {
    this.broadcast.emit("state", await this.state)
  }

  join(client: Socket, name: string) {
    let permission: Permission

    if (this.members.length) permission = this.defaultPermission
    else permission = Permission.Host | this.defaultPermission

    this.members.push({ name, client, permission })
    client.join(this.roomID)

    client.on("disconnect", () => this.leave(client))

    this.updateState()
    this.notify("join", client)
  }

  leave(client: Socket) {
    this.notify("leave", client)

    const member = this.getMember(client.id)
    const memberWasHost = member && (member.permission & Permission.Host) === Permission.Host

    if (memberWasHost) {
      const [newHost] = this.members.filter(m => m.client.id !== client.id)

      if (newHost) {
        newHost.permission ^= Permission.Host
        const secret = genSecret()
        this.hostSecret = secret
        newHost.client.emit("secret", secret)
      }
    }

    client.leave(this.roomID)
    this.removeMember(client.id)

    const memberAmount = Object.keys(this.members).length
    if (memberAmount <= 0) this.paused = true

    this.updateState()
  }

  async playContent(
    client: Socket | undefined,
    source: string | Promise<MediaSourceAny>,
    startFrom: number,
    secret?: string
  ) {
    if (!this.hasPermission(Permission.QueueControl, client?.id, secret)) return

    let sourceID = ""
    const currentSourceID =
      this.source?.originalSource.youtubeID ?? this.source?.originalSource.url

    if (typeof source === "string") {
      this.source = source ? await resolveContent(source, startFrom) : undefined
      if (this.source) {
        sourceID = this.source.originalSource.youtubeID ?? this.source.originalSource.url
      }
    } else {
      this.source = await source
      sourceID = this.source.originalSource.youtubeID ?? this.source.originalSource.url
    }


    if(this.source && !this.source.segments) 
    try {
      this.source.segments = await sponsorBlock.getSegments(sourceID, allCategories)
    } catch(e) {
      //no segments for video
    }
    startFrom = this.updateSegmentTimeouts(startFrom)

    if (sourceID === currentSourceID) {
      this.log("same video")

      this.lastSeekedTo = 0
      this.seekTo({ client, seconds: 0 })
      this.resume(client, secret)
      return
    }

    this.membersLoading = this.members.length
    this.membersPlaying = this.members.length
    this.lastSeekedTo = startFrom
    this.paused = true
    this.broadcast.emit("source", this.source)

    this.updateState()
    if (client) this.notify("playContent", client, { source, startFrom })
  }

  skipSegment(segment: Segment) {
    if (!this.paused && this.blockedCategories.includes(segment.category)) {
      this.seekTo({ seconds: segment.endTime })
    }
  }

  updateSegmentTimeouts(oldTime: number) : number {
    for (const segmentTimeout of this.segmentTimeouts) clearTimeout(segmentTimeout)
    if(this.source?.segments) {
      for (const segment of this.source.segments) {
        if (this.blockedCategories.includes(segment.category) 
          && segment.endTime > oldTime && oldTime > segment.startTime) oldTime = segment.endTime
      }
      for (const segment of this.source.segments) {
        if (segment.startTime > oldTime) {
          this.segmentTimeouts.push(
            setTimeout(() => this.skipSegment(segment), 1e3*(segment.startTime - oldTime))
          )
        }
      }
    } 
    return oldTime
  }

  clearSegmentTimeouts() : void {
    for (const segmentTimeout of this.segmentTimeouts) clearTimeout(segmentTimeout)
  }

  addQueue(client: Socket, source: string, startFrom: number, secret?: string) {
    if (!this.hasPermission(Permission.QueueControl, client?.id, secret)) return

    this.queue.push(resolveContent(source, startFrom))

    this.updateState()
    this.notify("queue", client)
  }

  clearQueue(client: Socket, secret?: string) {
    if (!this.hasPermission(Permission.QueueControl, client?.id, secret)) return

    this.queue = []

    this.updateState()
    this.notify("clearQueue", client)
  }

  playQueued(client: Socket, index: number, remove = false, secret?: string) {
    if (!this.hasPermission(Permission.QueueControl, client?.id, secret)) return

    const [next] = this.queue.splice(index, 1)
    if (!next) return this.log("client requested non-existant item from queue")

    if (remove) {
      this.notify("removeQueued", client)
      this.updateState()
    } else this.playContent(client, next, 0)
  }

  loaded() {
    this.membersLoading--
    this.updateState()

    if (this.membersLoading === 0) this.resume(undefined, this.hostSecret)
    this.log(`members loading: ${this.membersLoading}`)
  }

  finished() {
    this.membersPlaying--
    this.log(`members playing: ${this.membersPlaying}`)

    if (this.membersPlaying <= 0) {
      if (this.looping) {
        this.seekTo({ seconds: 0, secret: this.hostSecret })
        this.resume(undefined, this.hostSecret)
        return
      }
      const next = this.queue.shift()
      if (next) return this.playContent(undefined, next, 0, this.hostSecret)

      this.playContent(undefined, "", 0, this.hostSecret)
    }
  }

  pause(seconds?: number, client?: Socket, secret?: string) {
    if (!this.hasPermission(Permission.PlaybackControl, client?.id, secret)) return
    this.clearSegmentTimeouts()
    this.paused = true
    this.broadcast.emit("pause")

    if (seconds) this.seekTo({ seconds })

    this.updateState()
    if (client) this.notify("pause", client)
  }

  resume(client?: Socket, secret?: string) {
    if (!this.hasPermission(Permission.PlaybackControl, client?.id, secret)) return
    this.updateSegmentTimeouts(this.lastSeekedTo)

    this.paused = false
    this.broadcast.emit("resume")

    this.updateState()
    if (client) this.notify("resume", client)
  }

  updateLooping(newState: boolean, client?: Socket, secret?: string) {
    if (!this.hasPermission(Permission.PlaybackControl, client?.id, secret)) return
    seconds = this.updateSegmentTimeouts(seconds)

    this.looping = newState

    this.updateState()

    if (client) this.notify("looping", client, { newState: newState })
  }

  seekTo({ client, seconds, secret }: { client?: Socket; seconds: number; secret?: string }) {
    if (!this.hasPermission(Permission.PlaybackControl, client?.id, secret)) return

    this.lastSeekedTo = seconds
    this.broadcast.emit("seekTo", seconds)

    this.updateState()
    if (client) this.notify("seekTo", client, { seconds })
      else this.log(`Seeking to ${seconds}`)
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
    this.seekTo({ seconds: avg, secret: this.hostSecret })
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
  const getRoom = (roomID: string, client?: Socket) => {
    if (!rooms[roomID]) {
      if (client) {
        const secret = genSecret()
        client.emit("secret", secret)
        rooms[roomID] = new Room(roomID, io, secret)
      } else {
        rooms[roomID] = new Room(roomID, io)
      }
    }
    return rooms[roomID]
  }

  io.on("connect", client => {
    client.on("message", ({ msg, roomID, secret }) => {
      getRoom(roomID).message(msg, client)
    })

    client.on("loop", ({ secret, newState, roomID }) => {
      getRoom(roomID, client).updateLooping(newState, client, secret)
    })

    client.on("givePermission", ({ secret, id, permission, roomID }) => {
      if (secret) getRoom(roomID).grantPermission(secret, id, permission)
    })

    client.on("removePermission", ({ secret, id, permission, roomID }) => {
      if (secret) getRoom(roomID).revokePermission(secret, id, permission)
    })

    client.on("joinRoom", async ({ roomID, name, secret }, reply) => {
      const room = getRoom(roomID, client)
      room.join(client, name)

      reply(await room.state)
    })

    client.on("leaveRoom", ({ roomID, secret }) => {
      getRoom(roomID).leave(client)
    })

    client.on("playContent", ({ roomID, source, startFrom = 0, secret }) => {
      getRoom(roomID).playContent(client, source, startFrom, secret)
    })

    client.on("queue", ({ roomID, source, startFrom = 0, secret }) => {
      getRoom(roomID).addQueue(client, source, startFrom, secret)
    })

    client.on("clearQueue", ({ roomID, secret }) => getRoom(roomID).clearQueue(client, secret))

    client.on("playQueued", ({ roomID, index, secret }) => {
      getRoom(roomID).playQueued(client, index, false, secret)
    })

    client.on("removeQueued", ({ roomID, index, secret }) => {
      getRoom(roomID).playQueued(client, index, true, secret)
    })

    client.on("loaded", ({ roomID }) => getRoom(roomID).loaded())
    client.on("finished", ({ roomID }) => getRoom(roomID).finished())

    client.on("pause", ({ roomID, currentTime, secret }) => {
      getRoom(roomID).pause(currentTime, client, secret)
    })

    client.on("resume", ({ roomID, secret }) => {
      getRoom(roomID).resume(client, secret)
    })

    client.on("seekTo", ({ roomID, currentTime, secret }) => {
      getRoom(roomID).seekTo({ client, seconds: currentTime, secret })
    })

    client.on("resync", ({ roomID }) => getRoom(roomID).resync(client))

    client.on("playbackError", ({ roomID, reason, currentTime, name }) => {
      getRoom(roomID).playbackError({ client, reason, name }, currentTime)
    })

    client.on("getNewRandom", reply => reply(getNewRandom()))
  })
}
