console.log("\x1Bc")

const io = require("socket.io")({
  serveClient: false,
})

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
  seekTo(time) {
    this.time = time
    io.to(this.id).emit("update", { time })
  }
}

const rooms = {}

const clients = {}

io.on("connection", client => {
  clients[client.id] = {}
  client.on("joinroom", ({ id, name }, reply) => {
    console.log(`joinroom ${client.id} ${name}`)
    if (!rooms[id]) rooms[id] = new Room(id)
    client.join(id)
    rooms[id].people[client.id] = name
    reply(rooms[id].state)
    io.to(id).emit("update", { people: rooms[id].people })
    clients[client.id] = {
      name: name,
      room: id,
    }
    console.log("joined", clients, client.id)
  })

  const leave = () => {
    console.log("leave", clients)
    if (!clients[client.id]) return
    const { name, room: id } = clients[client.id]
    console.log(`leave ${name} ${client.id}`, rooms[id])

    if (!rooms[id]) return console.log("rrrrr")
    delete rooms[id].people[client.id]
    console.log(rooms[id].people)
    client.leave(id)
    io.to(id).emit("update", { people: rooms[id].people })
    clients[client.id] = false
    console.log("left", clients)
  }
  client.on("leaveroom", leave)
  client.on("disconnect", leave)

  client.on("play", ([room, urlid]) => rooms[room].play(urlid))
  client.on("stop", ([room]) => rooms[room].stop())
  client.on("playpause", ([room, time]) => rooms[room].playpause(time))
  client.on("seekTo", ([room, time]) => rooms[room].seekTo(time))
})

io.listen(1169)
console.log("w2g port 1169")
