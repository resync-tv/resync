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
  }
  get state() {
    return {
      urlid: this.urlid,
      playing: this.playing,
      time: this.time,
    }
  }
  play(urlid) {
    console.log("video", this.id)
    this.urlid = urlid
    this.playing = true
    this.time = 0
    io.to(this.id).emit("update", {
      urlid: this.urlid,
      playing: this.playing,
      time: this.time,
    })
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

io.on("connection", client => {
  client.on("joinroom", (room, reply) => {
    if (!rooms[room]) rooms[room] = new Room(room)
    client.join(room)
    reply(rooms[room].state)
  })

  client.on("play", ([room, urlid]) => rooms[room].play(urlid))
  client.on("playpause", ([room, time]) => rooms[room].playpause(time))
  client.on("seekTo", ([room, time]) => rooms[room].seekTo(time))
})

io.listen(1169)
