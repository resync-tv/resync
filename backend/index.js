const io = require("socket.io")({
  serveClient: false,
})

let dev = false

const log = t => (dev ? console.log(t) : "")

console.log("\x1Bc\n\n")

const Room = class {
  constructor(id) {
    this.id = id
    this.playing = false
    this.urlid = ""
    this.time = 0
    this.queue = []
    this.people = {}
  }
  get state() {
    return {
      urlid: this.urlid,
      playing: this.playing,
      time: this.time,
      people: this.people,
    }
  }
  play(urlid) {
    this.urlid = urlid
    this.playing = true
    this.time = 0
    io.to(this.id).emit("update", rooms[this.id].state)
  }
  stop() {
    this.playing = false
    this.urlid = ""
    this.time = 0
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

  client.on("joinroom", ({ id, name }, reply) => {
    log(`joinroom ${name} ${id}`)
    if (!rooms[id]) rooms[id] = new Room(id)
    client.join(id)
    rooms[id].people[client.id] = name
    reply(rooms[id].state)
    io.to(id).emit("update", { people: rooms[id].people })
    clients[client.id] = {
      name: name,
      room: id,
    }
  })

  const leave = () => {
    const { name, room: id } = clients[client.id]
    if (!clients[client.id] || !rooms[id]) return
    log(`leaveroom ${name} ${id}`)

    delete rooms[id].people[client.id]
    client.leave(id)
    io.to(id).emit("update", { people: rooms[id].people })
    clients[client.id] = false
  }
  client.on("leaveroom", leave)
  client.on("disconnect", leave)

  client.on("play", ([room, urlid]) => {
    rooms[room].play(urlid)
    log(`${clients[client.id].name} play ${urlid}`)
  })
  client.on("stop", ([room]) => {
    rooms[room].stop()
    log(`${clients[client.id].name} stop`)
  })
  client.on("playpause", ([room, time]) => {
    rooms[room].playpause(time)
    log(`${clients[client.id].name} playpause ${time}`)
  })
  client.on("resume", ([room, time]) => {
    rooms[room].resume(time)
    log(`${clients[client.id].name} resume ${time}`)
  })
  client.on("pause", ([room, time]) => {
    rooms[room].pause(time)
    log(`${clients[client.id].name} pause ${time}`)
  })
  client.on("seekTo", ([room, time]) => {
    rooms[room].seekTo(time)
    log(`${clients[client.id].name} seekTo ${time}`)
  })
})

io.listen(1169)
console.log("w2g port 1169")
