const io = require("socket.io")()

let dev = false

const log = t => (dev ? console.log(t) : "")

const Room = class {
  constructor(id) {
    this.id = id
    this.playing = false
    this.urlid = ""
    this.time = 0
    this.queue = []
    this.people = {}
    this.endedFor = 0
  }
  get state() {
    return {
      urlid: this.urlid,
      playing: this.playing,
      time: this.time,
      people: this.people,
      queue: this.queue,
    }
  }
  play(urlid) {
    this.urlid = urlid
    this.playing = true
    this.time = 0
    io.to(this.id).emit("update", rooms[this.id].state)
  }
  addqueue(urlid) {
    this.queue.push(urlid)
    io.to(this.id).emit("update", { queue: this.queue })
  }
  removequeue(index) {
    this.queue.splice(index, 1)
    io.to(this.id).emit("update", { queue: this.queue })
  }
  playqueue(index) {
    this.play(this.queue.splice(index, 1)[0])
  }
  ended() {
    this.endedFor++
    if (this.endedFor >= Object.keys(this.people).length) {
      this.endedFor = 0
      if (this.queue.length > 0) this.playqueue(0)
      else this.stop()
    }
  }
  stop() {
    this.playing = false
    this.index = ""
    this.time = 0
    this.urlid = ""
    this.queue = []
    io.to(this.id).emit("update", rooms[this.id].state)
  }
  playpause(time) {
    this.playing = !this.playing
    let update = {
      playing: this.playing,
    }
    if (time) update = { ...update, time: time }
    io.to(this.id).emit("update", update)
  }
  resume(time) {
    this.playing = true
    let update = {
      playing: this.playing,
    }
    if (time) update = { ...update, time: time }
    io.to(this.id).emit("update", update)
  }
  pause(time) {
    this.playing = false
    let update = {
      playing: this.playing,
    }
    if (time) update = { ...update, time: time }
    io.to(this.id).emit("update", update)
  }
  seekTo(time) {
    this.time = time
    io.to(this.id).emit("update", { time })
  }
}

const rooms = {}

const clients = {}

io.on("connection", client => {
  clients[client.id] = {}

  client.on("dev", () => {
    if (!dev) console.log("dev mode is now active")
    dev = true
  })

  client.on("joinroom", ({ room, name }, reply) => {
    log(`${name} joined [${room}]`)
    if (!rooms[room]) rooms[room] = new Room(room)
    client.join(room)
    rooms[room].people[client.id] = name
    reply(rooms[room].state)
    io.to(room).emit("update", { people: rooms[room].people })
    clients[client.id] = { name, room }
  })

  const leave = () => {
    const { name, room } = clients[client.id]
    if (!clients[client.id] || !rooms[room]) return
    log(`${name} left [${room}]`)

    delete rooms[room].people[client.id]
    client.leave(room)
    io.to(room).emit("update", { people: rooms[room].people })
    clients[client.id] = false
  }
  client.on("leaveroom", leave)
  client.on("disconnect", leave)

  ![
    "play",
    "addqueue",
    "removequeue",
    "playqueue",
    "ended",
    "stop",
    "playpause",
    "resume",
    "pause",
    "seekTo",
  ].forEach(action => {
    client.on(action, ([room, arg]) => {
      rooms[room][action](arg)
      log(`[${room}] ${clients[client.id].name}: ${action} ${arg || ""}`)
    })
  })
})

io.listen(1169)
console.log("w2g port 1169")
