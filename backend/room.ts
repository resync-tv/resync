import type { BroadcastOperator, Server, Socket } from "socket.io"
import type { MediaSourceAny } from "$/mediaSource"
import type { NotifyEvents, RoomState, Member, EventNotification } from "$/room"
import type { BackendEmits, PointerUpdate, ResyncSocketBackend } from "$/socket"
import type { Category, Segment } from "sponsorblock-api"

import { SponsorBlock } from "sponsorblock-api"
import { average } from "./util"
import { customAlphabet } from "nanoid"
import { nolookalikesSafe } from "nanoid-dictionary"

import { allCategories, defaultBlockedCategories } from "./sponsorblock"
import { checkPermission, Permission } from "./permission"
import { randomBytes } from "crypto"

const nanoid = customAlphabet(nolookalikesSafe, 6)

import { resolveContent } from "./content"

import debug from "debug"
const log = debug("resync:room")

const genSecret = () => randomBytes(256).toString("hex")
const sponsorBlock = new SponsorBlock("resync-sponsorblock")

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
  private playbackSpeed: number
  private looping: boolean
  private hostSecret: string
  private defaultPermission: Permission
  readonly roomID: string
  private blockedCategories: Record<Category, boolean>
  private segmentTimeouts: NodeJS.Timeout[]
  private io: ResyncSocketBackend
  private log: debug.Debugger
  readonly broadcast: BroadcastOperator<BackendEmits>

  private sharedPointerEnabled: boolean
  private sharedPointers: PointerUpdate[]
  private sharedPointersChanged: boolean

  public members: Array<Member> = []

  paused = true
  lastSeekedTo = 0
  source: MediaSourceAny | undefined
  queue: Promise<MediaSourceAny>[] = []
  membersLoading: Array<Member> = []
  membersPlaying = 0
  loading: boolean = false

  constructor(roomID: string, io: Server, secret?: string) {
    log(`constructing room ${roomID}`)

    setInterval(() => {
      if (this.members && this.sharedPointersChanged) {
        this.broadcast.emit("pointerUpdate", this.sharedPointers)
        this.sharedPointersChanged = false
      }
    }, 50)

    this.playbackSpeed = 1.0
    this.looping = false
    this.hostSecret = secret ?? ""
    this.defaultPermission = 0 // Permission.ContentControl | Permission.PlaybackControl

    this.sharedPointerEnabled = false
    this.sharedPointers = []
    this.sharedPointersChanged = false
    this.blockedCategories = defaultBlockedCategories
    this.segmentTimeouts = []
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
      const hasPermission = checkPermission(member.permission, requiredPermission)
      if (!hasPermission) this.log(`${member.name} doesn't have ${requiredPermission}`)
      return hasPermission
    } else {
      this.log("Permission error!")
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

  grantPermission(secret: string, id: string, permission: Permission, defaultValue = false) {
    if (this.hostSecret !== secret) return

    if (!defaultValue) {
      const member = this.getMember(id)

      if (member && !checkPermission(member.permission, permission)) {
        member.permission ^= permission
      }
    } else {
      if (!checkPermission(this.defaultPermission, permission)) {
        this.defaultPermission ^= permission
      }
    }

    this.updateState()
  }

  revokePermission(secret: string, id: string, permission: Permission, defaultValue = false) {
    if (this.hostSecret !== secret) return

    if (!defaultValue) {
      const member = this.getMember(id)

      if (member && checkPermission(member.permission, permission)) {
        member.permission ^= permission
      }
    } else {
      if (checkPermission(this.defaultPermission, permission)) {
        this.defaultPermission ^= permission
      }
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
        playbackSpeed: this.playbackSpeed,
        blockedCategories: this.blockedCategories,
        looping: this.looping,
        paused: this.paused,
        source: this.source,
        lastSeekedTo: this.lastSeekedTo,
        members: this.members.map(({ client, name, permission }) => ({
          id: client.id,
          permission,
          name,
        })),
        defaultPermission: this.defaultPermission,
        membersLoading: this.membersLoading.map(({ client, name, permission }) => ({
          id: client.id,
          permission,
          name,
        })),
        queue: await Promise.all(this.queue),
        sharedPointerEnabled: this.sharedPointerEnabled,
      }
    })()
  }

  getMember = (id: string) => this.members.find(m => m.client.id === id)
  removeMember = (id: string) => (this.members = this.members.filter(m => m.client.id !== id))

  async updateState() {
    this.broadcast.emit("state", await this.state)
  }

  toggleSharedPointer(client: Socket, secret?: string) {
    if (!this.hasPermission(Permission.Host, client.id, secret)) return
    this.sharedPointerEnabled = !this.sharedPointerEnabled
    this.updateState()
  }

  pointerUpdate(pos: [number, number], active: boolean, client: Socket) {
    const pointer = this.sharedPointers.find(({ member }) => member.id === client.id)
    const member = this.getMember(client.id)
    if (member) {
      if (!pointer) {
        this.sharedPointers.push({
          member: { name: member.name, id: client.id, permission: member.permission },
          pos,
          active,
        })
      } else {
        pointer.pos = pos
        pointer.active = active
      }
      this.sharedPointersChanged = true
    }
  }

  join(client: Socket, name: string) {
    let permission: Permission

    if (this.members.length) permission = this.defaultPermission
    else {
      permission = Permission.Host | this.defaultPermission
      const secret = genSecret()
      this.hostSecret = secret
      client.emit("secret", secret)
    }

    this.members.push({ name, client, permission })
    client.join(this.roomID)

    client.on("disconnect", () => this.leave(client))

    this.updateState()
    this.notify("join", client)
  }

  leave(client: Socket) {
    this.notify("leave", client)

    this.membersPlaying--

    this.membersLoading = this.membersLoading.filter(m => m.client.id !== client.id)
    if (this.membersLoading.length === 0 && this.loading) {
      this.resume(undefined, this.hostSecret)
      this.loading = false 
    }
    this.log(`members loading: ${this.membersLoading.length}`)

    const member = this.getMember(client.id)
    const memberWasHost = member && checkPermission(member.permission, Permission.Host)
    const pointer = this.sharedPointers.find(pointer => pointer.member.id === client.id)
    if (pointer) this.sharedPointers.splice(this.sharedPointers.indexOf(pointer), 1)

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

    const memberAmount = this.members.length
    if (memberAmount <= 0) this.paused = true

    this.updateState()
  }

  async playContent(
    client: Socket | undefined,
    source: string | Promise<MediaSourceAny>,
    startFrom: number,
    secret?: string
  ) {
    if (!this.hasPermission(Permission.ContentControl, client?.id, secret)) return

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

    if (this.source) {
      if (!this.source.segments) {
        try {
          sponsorBlock.getSegments(sourceID, allCategories).then((segments) => {
            if (this.source && this.source?.originalSource.youtubeID === sourceID) {
              this.source.segments = segments
              this.source.startFrom = this.updateSegmentTimeouts(startFrom)
              this.updateState()
              log('found segments')
            }
          }).catch(e => {
            log(e, '[sponsorblock error]')
          })
        } catch (e) {
          log(e, '[sponsorblock error]')
        }
      } else {
        this.updateSegmentTimeouts(startFrom)
      }
    }

    this.seekTo({ client: undefined, seconds: startFrom ?? 0, secret: this.hostSecret })

    if (sourceID === currentSourceID) {
      this.log(`same video, starting from ${this.source?.startFrom}`)

      this.lastSeekedTo = this.source?.startFrom ?? 0
      this.resume(client, secret)
      return
    }


    this.membersLoading = this.members
    this.membersPlaying = this.members.length
    this.loading = true
    this.lastSeekedTo = startFrom
    this.paused = true
    this.broadcast.emit("source", this.source)

    this.updateState()
    if (client) this.notify("playContent", client, { source, startFrom })
  }

  async editBlocked(category: Category, newValue: boolean) {
    this.blockedCategories[category] = newValue
    let avg = await this.requestTime()
    if (avg !== (avg = this.updateSegmentTimeouts(avg)))//vaaski please find this gem
      this.seekTo({ seconds: avg, secret: this.hostSecret })
    this.updateState()
  }

  skipSegment(segment: Segment) {
    if ((!this.paused || this.lastSeekedTo === 0) && this.blockedCategories[segment.category]) {
      this.seekTo({ seconds: segment.endTime, secret: this.hostSecret })
      this.notify("sponsorblock", this.members[0].client, { seconds: segment.endTime })
    }
  }

  updateSegmentTimeouts(oldTime: number): number {
    for (const segmentTimeout of this.segmentTimeouts) clearTimeout(segmentTimeout)
    if (this.source?.segments) {
      for (const segment of this.source.segments) {
        if (
          this.blockedCategories[segment.category] &&
          segment.endTime > oldTime &&
          oldTime >= segment.startTime
        ) {
          oldTime = segment.endTime
          this.skipSegment(segment)
        }
      }
      for (const segment of this.source.segments) {
        if (segment.startTime > oldTime) {
          this.segmentTimeouts.push(
            setTimeout(
              () => this.skipSegment(segment),
              (1e3 * (segment.startTime - oldTime)) / this.playbackSpeed
            )
          )
        }
      }
    }
    return oldTime
  }

  clearSegmentTimeouts(): void {
    for (const segmentTimeout of this.segmentTimeouts) clearTimeout(segmentTimeout)
  }

  addQueue(client: Socket, source: string, startFrom: number, secret?: string) {
    if (!this.hasPermission(Permission.ContentControl, client.id, secret)) return
    this.queue.push(resolveContent(source, startFrom))

    this.updateState()
    this.notify("queue", client)
  }

  clearQueue(client: Socket, secret?: string) {
    if (!this.hasPermission(Permission.ContentControl, client.id, secret)) return

    this.queue = []

    this.updateState()
    this.notify("clearQueue", client)
  }

  playQueued(client: Socket, index: number, remove = false, secret?: string) {
    if (!this.hasPermission(Permission.ContentControl, client.id, secret)) return

    const [next] = this.queue.splice(index, 1)
    if (!next) return this.log("client requested non-existant item from queue")

    if (remove) {
      this.notify("removeQueued", client)
      this.updateState()
    } else this.playContent(client, next, 0, secret)
  }

  loaded(client: Socket) {
    this.membersLoading = this.membersLoading.filter(m => m.client.id !== client.id)
    this.updateState()

    if (this.membersLoading.length === 0) {
      this.resume(undefined, this.hostSecret)
      this.loading = false
    }
    this.log(`members loading: ${this.membersLoading.length}`)
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

  async changePlaybackSpeed(newSpeed: number, client?: Socket, secret?: string) {
    if (!this.hasPermission(Permission.PlaybackControl, client?.id, secret)) return
    const avg = await this.requestTime()

    this.playbackSpeed = newSpeed

    this.updateSegmentTimeouts(avg)
    this.updateState()
  }

  pause(seconds?: number, client?: Socket, secret?: string) {
    if (!this.hasPermission(Permission.PlaybackControl, client?.id, secret)) return

    this.clearSegmentTimeouts()

    this.paused = true
    this.broadcast.emit("pause")

    if (seconds) this.seekTo({ seconds, secret: this.hostSecret })

    this.updateState()
    if (client) this.notify("pause", client)
  }

  resume(client?: Socket, secret?: string) {
    if (!this.hasPermission(Permission.PlaybackControl, client?.id, secret)) return
    this.updateSegmentTimeouts(this.lastSeekedTo)

    this.updateSegmentTimeouts(this.lastSeekedTo)
    this.paused = false
    this.broadcast.emit("resume")

    this.updateState()
    if (client) this.notify("resume", client)
  }

  updateLooping(newState: boolean, client?: Socket, secret?: string) {
    if (!this.hasPermission(Permission.PlaybackControl, client?.id, secret)) return
    this.looping = newState

    this.updateState()

    if (client) this.notify("looping", client, { newState: newState })
  }

  seekTo({ client, seconds, secret }: { client?: Socket; seconds: number; secret?: string }) {
    if (!this.hasPermission(Permission.PlaybackControl, client?.id, secret)) return
    seconds = this.updateSegmentTimeouts(seconds)

    this.lastSeekedTo = seconds
    this.broadcast.emit("seekTo", seconds)

    this.updateState()
    if (client) this.notify("seekTo", client, { seconds })
    else this.log(`Seeking to ${seconds}`)
  }

  async requestTime(client?: Socket) {
    const requestTimeLog = this.log.extend("requestTime")
    requestTimeLog("requested time")

    let otherClients: string[]

    const sockets = await this.broadcast.allSockets()
    if (client) {
      otherClients = [...sockets].filter(s => s !== client.id)
    } else {
      otherClients = [...sockets]
    }

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
    this.pause(undefined, undefined, this.hostSecret)

    const avg = await this.requestTime(client)
    this.seekTo({ seconds: avg, secret: this.hostSecret })
    this.resume(undefined, this.hostSecret)

    this.updateState()
    this.notify("resync", client)
  }

  playbackError({ client, reason, name }: PlaybackErrorArg, seconds: number) {
    this.notify("playbackError", client, { reason, name })
    this.pause(undefined, undefined, this.hostSecret)
    this.seekTo({ seconds, secret: this.hostSecret })
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
    client.on("toggleSharedPointer", ({ roomID, secret }) => {
      getRoom(roomID).toggleSharedPointer(client, secret)
    })
    client.on("pointerUpdate", ({ pos, active, roomID }) => {
      getRoom(roomID).pointerUpdate(pos, active, client)
    })

    client.on("changePlaybackSpeed", ({ newSpeed, roomID, secret }) => {
      getRoom(roomID).changePlaybackSpeed(newSpeed, client, secret)
    })

    client.on("blockedToggle", ({ category, newValue, roomID }) => {
      getRoom(roomID).editBlocked(category, newValue)
    })

    client.on("message", ({ msg, roomID }) => {
      getRoom(roomID).message(msg, client)
    })

    client.on("loop", ({ secret, newState, roomID }) => {
      getRoom(roomID, client).updateLooping(newState, client, secret)
    })

    client.on("givePermission", ({ secret, id, permission, defaultValue, roomID }) => {
      if (secret) getRoom(roomID).grantPermission(secret, id, permission, defaultValue)
    })

    client.on("removePermission", ({ secret, id, permission, defaultValue, roomID }) => {
      if (secret) getRoom(roomID).revokePermission(secret, id, permission, defaultValue)
    })

    client.on("joinRoom", async ({ roomID, name }, reply) => {
      const room = getRoom(roomID, client)
      room.join(client, name)

      reply(await room.state)
    })

    client.on("leaveRoom", ({ roomID }) => {
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

    client.on("loaded", ({ roomID }) => getRoom(roomID).loaded(client))
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
