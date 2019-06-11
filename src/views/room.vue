<template lang="pug">
.room
  .player
    .url
      .input
        input(v-model="url" type="text" placeholder="url" autocomplete="off" autocorrect="off"
          autocapitalize="off" spellcheck="false")
        span
      button.flat(@click="playurl") play
      //- button.flat(@click="queueurl") queue
    .video
      .progress(@click="progress_click")
        .bar(:style="{width: `${progress * 100}%`}")
      .overlay(@click="overlay_click")
      youtube(:video-id="urlid" ref="youtube" :player-vars="pv" width="1280" height="720"
        :fitParent="true" @playing="playing" @ready="ready" @paused="paused")
</template>

<script>
const debounce = (fn, ms = 0) => {
  let timeoutId
  return function(...args) {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn.apply(this, args), ms)
  }
}
export default {
  name: "room",
  data: () => ({
    urlid: "",
    url: "http://youtu.be/LuJkVuB-tGM",
    progress: 0,
    pv: {
      autoplay: 0,
      controls: 0,
      disablekb: 1,
      fs: 0,
      iv_load_policy: 3,
      loop: 0,
      modestbranding: 1,
      rel: 0,
    },
  }),
  computed: {
    p() {
      return this.$refs.youtube.player
    },
    id() {
      return this.$route.params.id
    },
  },
  watch: {
    url(n) {
      this.cleanurl(this)
    },
  },
  mounted() {
    const self = this
    window.room = self

    const update = ({ urlid, time, playing }) => {
      const { p } = this
      if (urlid) {
        self.urlid = urlid
        if (playing) self.pv.autoplay = 1
      }
      if (typeof time === "number") p.seekTo(time)
      if (typeof playing === "boolean") {
        if (playing) p.playVideo()
        else p.pauseVideo()
      }
    }

    self.socket.emit("joinroom", self.id, update)
    self.socket.on("update", update)
  },
  beforeDestroy() {
    this.socket.off("upadate")
  },
  methods: {
    async progress_click(e) {
      const time =
        (e.offsetX / e.target.offsetWidth) * (await this.p.getDuration())
      this.socket.emit("seekTo", [this.id, time])
    },
    cleanurl: debounce(self => {
      const id = self.$youtube.getIdFromUrl(self.url)
      if (id) self.url = `http://youtu.be/${id}`
    }, 500),
    async overlay_click() {
      let update = [this.id]
      if ((await this.p.getPlayerState()) === 1)
        update = [...update, await this.p.getCurrentTime()]
      this.socket.emit("playpause", update)
    },
    playurl() {
      this.socket.emit("play", [this.id, this.$youtube.getIdFromUrl(this.url)])
    },
    queueurl() {
      console.log(this.$youtube.getIdFromUrl(this.url))
    },
    async play_loop() {
      this.progress =
        (await this.p.getCurrentTime()) / (await this.p.getDuration())

      if ((await this.p.getPlayerState()) === 1) setTimeout(this.play_loop, 50)
    },
    playing() {
      this.play_loop()
    },
    ready() {
      console.log("ready")
    },
    paused() {},
  },
}
</script>

<style lang="stylus">
.room
  height: 100%
  width: 100%
  display: flex
  justify-content: center
  align-items: center

  >.player
    display: flex
    justify-content: center
    align-items: center
    flex-direction: column

    >.url
      width: 75%
      display: flex
      justify-content: center
      align-items: center

      >.input
        flex-grow: 1

        >input
          text-align: center
          font-size: 1.5em

    >.video
      width: 1280px
      height: 720px
      position: relative
      overflow: hidden
      border-radius: 5px

      >.progress
        position: absolute
        bottom: 0
        height: 25px
        width: 100%
        z-index: 2
        display: flex
        align-items: flex-end

        >.bar
          transition: height 0.1s
          height: 1px
          width: 50%
          background: #FFF

        &:hover
          >.bar
            height: 5px

      >.overlay
        position: absolute
        height: 100%
        width: 100%
        z-index: 1

      >iframe
        z-index: 0
</style>

