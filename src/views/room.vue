<template lang="pug">
.room
  .player
    .url
      .input
        input(v-model="urlinput" type="text" placeholder="url" autocomplete="off" autocorrect="off"
          autocapitalize="off" spellcheck="false")
        span
      button.flat(@click="playurl" :class="{ disabled: !validlink}") play
      //- button.flat(@click="queueurl") queue
    .video(:class="{ ispaused }")
      .progress(@pointerdown="progress_click")
        .bar(:style="{width: `${progress * 100}%`}")
      .volume(@pointerdown="volume_click")
        .bar(:style="{height: `${volume}%`}")
      .overlay(@click="overlay_click")
        h1 paused
      .player
        youtube(:video-id="urlid" ref="youtube" :player-vars="pv" width="1280" height="720"
          :fitParent="true" @playing="playing" @ready="ready" @paused="paused")
    .queue
      .video
        .thumb
        .info
          .title
          .uploader
</template>

<script>
import ls from "local-storage"
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
    urlinput: "",
    progress: 0,
    volume: ls("volume") || 50,
    ispaused: true,
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
    validlink() {
      return !!this.$youtube.getIdFromUrl(this.urlinput)
    },
  },
  watch: {
    urlinput(n) {
      this.cleanurl(this)
    },
  },
  mounted() {
    const self = this
    window.room = self

    window.onkeydown = async ({ keyCode }) => {
      if (keyCode === 37)
        self.socket.emit("seekTo", [
          self.id,
          (await self.p.getCurrentTime()) - 5,
        ])
      else if (keyCode === 39)
        self.socket.emit("seekTo", [
          self.id,
          (await self.p.getCurrentTime()) + 5,
        ])
      else if (keyCode === 38) {
        self.volume = Math.min(100, self.volume + 5)
        self.p.setVolume(self.volume)
        ls("volume", self.volume)
      } else if (keyCode === 40) {
        self.volume = Math.max(0, self.volume - 5)
        self.p.setVolume(self.volume)
        ls("volume", self.volume)
      } else if (keyCode === 32) {
        self.overlay_click()
      }
    }

    const update = ({ urlid, time, playing }) => {
      const { p } = this
      if (urlid) {
        self.urlid = urlid
        self.urlinput = `https://youtu.be/${urlid}`
        if (playing) self.pv.autoplay = 1
      }
      if (typeof time === "number") {
        p.seekTo(time)
        this.play_loop()
      }
      if (typeof playing === "boolean") {
        if (playing) p.playVideo()
        else p.pauseVideo()
      }
    }

    self.socket.emit("joinroom", self.id, update)
    self.socket.on("update", update)
  },
  beforeDestroy() {
    window.onkeydown = null
    this.socket.off("upadate")
  },
  methods: {
    async progress_click(e) {
      const time =
        (e.offsetX / e.target.offsetWidth) * (await this.p.getDuration())
      this.socket.emit("seekTo", [this.id, time])
      this.play_loop()
    },
    volume_click(e) {
      this.volume = (1 - e.offsetY / e.target.offsetHeight) * 100
      this.p.setVolume(this.volume)
      ls("volume", this.volume)
    },
    cleanurl: debounce(self => {
      const urlid = self.$youtube.getIdFromUrl(self.urlinput)
      if (urlid) self.urlinput = `https://youtu.be/${urlid}`
    }, 500),
    async overlay_click() {
      let update = [this.id]
      if ((await this.p.getPlayerState()) === 1)
        update = [...update, await this.p.getCurrentTime()]
      this.socket.emit("playpause", update)
    },
    playurl() {
      if (!this.$youtube.getIdFromUrl(this.urlinput)) return
      this.socket.emit("play", [
        this.id,
        this.$youtube.getIdFromUrl(this.urlinput),
      ])
    },
    queueurl() {
      console.log(this.$youtube.getIdFromUrl(this.urlinput))
    },
    async play_loop() {
      this.progress =
        (await this.p.getCurrentTime()) / (await this.p.getDuration())

      if ((await this.p.getPlayerState()) === 1) setTimeout(this.play_loop, 50)
    },
    playing() {
      this.play_loop()
      this.p.setVolume(this.volume)
      this.ispaused = false
    },
    ready() {},
    paused() {
      this.ispaused = true
    },
  },
}
</script>

<style lang="stylus">
.room
  height: 100%
  width: 100%
  display: flex
  justify-content: center

  >.player
    display: flex
    flex-direction: column
    align-items: center
    padding-top: 32px

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
          font-family: monospace
          color: rgba(255, 255, 255, 0.5)
          transition: 0.5s ease
          font-weight: lighter

          &:focus
            color: #FFF

    >.video
      width: 1280px
      height: 720px
      position: relative
      border-radius: 5px
      transition: 0.5s ease

      >.volume
        position: absolute
        left: 100%
        bottom: 5px
        height: calc(100% - 10px)
        width: 25px
        display: flex
        align-items: flex-end
        background: transparent

        >.bar
          transition: 0.25s
          width: 2px
          height: 20%
          background: #FFF
          // border-radius: 2px
          pointer-events: none

        &:hover
          >.bar
            width: 5px
            // border-radius: 2.5px

      >.progress
        position: absolute
        bottom: 0
        height: 25px
        width: 100%
        z-index: 2
        display: flex
        align-items: flex-end
        border-radius: 0 0 5px 5px
        overflow: hidden

        >.bar
          transition: 0.25s
          transition-property: height, box-shadow
          height: 2px
          width: 50%
          background: #FFF
          pointer-events: none
          box-shadow: none

        &:hover
          >.bar
            height: 5px
            box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.5)

      >.overlay
        position: absolute
        height: 100%
        width: 100%
        z-index: 1
        transition: 0.5s ease
        display: flex
        justify-content: center
        align-items: center
        opacity: 0
        background: rgba(0, 0, 0, 0.5)
        border-radius: 5px

        >h1
          color: rgba(255, 255, 255, 0.75)
          font-size: 3em
          user-select: none
          pointer-events: none
          padding: 0 1em
          background: -webkit-linear-gradient(top, rgba(255, 255, 255, 0.125) 0%, rgba(255, 255, 255, 0.25) 25%, rgba(255, 255, 255, 1) 100%)
          -webkit-background-clip: text
          -webkit-text-fill-color: transparent

      &.ispaused
        box-shadow: 0 0 0 3px #FFF

        >.overlay
          opacity: 1

      >.player
        overflow: hidden
        border-radius: 5px
        height: 720px

        >iframe
          z-index: 0
</style>

