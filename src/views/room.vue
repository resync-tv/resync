<template lang="pug">
.room
  .player(:class="{ novideo: urlid === '' }")
    .url
      .input
        input(v-model="urlinput" type="text" placeholder="url" autocomplete="off" autocorrect="off"
          autocapitalize="off" spellcheck="false" :class="{ validlink }" @click.right="paste")
        span
      button.flat(ref="searchbutton" @click="playurl" :class="{ disabled: !validlink}") play
    button.flat(ref="searchbutton1" @click="playurl" :class="{ disabled: !validlink}") play
    .video(:class="{ ispaused }")
      .progress(@pointerdown="progress_click")
        .bar(:style="{width: `${progress * 100}%`}")
      .volume(@pointerdown="volume_click")
        .bar(:style="{height: `${volume}%`}")
      .overlay(@click="overlay_click" ref="overlay")
        h1.paused paused
      .player
        youtube(:video-id="urlid" ref="youtube" :player-vars="pv" width="1280" height="720"
          :fitParent="true" @playing="playing" @ready="ready" @paused="paused")
    .queue
      .video
        .thumb
        .info
          .title
          .uploader
  .people
    .person test
    .person(v-for="person in people") {{person}}
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
const throttle = (fn, wait) => {
  let inThrottle, lastFn, lastTime
  return function() {
    const context = this,
      args = arguments
    if (!inThrottle) {
      fn.apply(context, args)
      lastTime = Date.now()
      inThrottle = true
    } else {
      clearTimeout(lastFn)
      lastFn = setTimeout(function() {
        if (Date.now() - lastTime >= wait) {
          fn.apply(context, args)
          lastTime = Date.now()
        }
      }, Math.max(wait - (Date.now() - lastTime), 0))
    }
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
    people: [],
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

    self.$store.commit("set", ["lastroom", self.id])

    const { searchbutton: sb, searchbutton1: sb1, overlay } = self.$refs
    sb.style.setProperty("--max-width", `${sb.scrollWidth}px`)
    sb1.style.setProperty("--max-height", `${sb1.scrollHeight}px`)

    window.onkeydown = async ({ keyCode, target }) => {
      if (target.nodeName === "INPUT") return
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

    const update = ({ urlid, time, playing, people }) => {
      const { p } = self
      if (urlid) {
        self.urlid = urlid
        self.urlinput = `https://youtu.be/${urlid}`
        if (playing) self.pv.autoplay = 1
      } else if (urlid === "") {
        self.urlid = ""
      }
      if (typeof time === "number") {
        p.seekTo(time)
        this.play_loop()
      }
      if (typeof playing === "boolean") {
        if (playing) p.playVideo()
        else p.pauseVideo()
      }
      if (people instanceof Array) self.people = people
    }

    const { name } = self.$store.state

    self.socket.emit("joinroom", { id: self.id, name }, update)
    self.socket.on("update", update)
  },
  beforeDestroy() {
    window.onkeydown = null
    this.socket.off("upadate")
    console.log(this.$store.state.lastroom)
    this.socket.emit("leaveroom")
    console.log("before destroy")
  },
  methods: {
    paste(e) {
      const self = this
      e.preventDefault()
      navigator.clipboard
        .readText()
        .then(text => {
          self.urlinput = text
          const urlid = self.$youtube.getIdFromUrl(self.urlinput)
          if (urlid) self.playurl()
        })
        .catch(console.log)
    },
    async progress_click(e) {
      const time =
        (e.offsetX / e.target.offsetWidth) * (await this.p.getDuration())
      this.socket.emit("seekTo", [this.id, time])
      this.play_loop()
    },
    volume_click({ offsetY, target }) {
      const self = this
      self.volume = (1 - offsetY / target.offsetHeight) * 100
      self.p.setVolume(self.volume)
      ls("volume", self.volume)

      target.onpointermove = throttle(({ offsetY: oy, target: t }) => {
        self.volume = (1 - oy / t.offsetHeight) * 100
        self.p.setVolume(self.volume)
        ls("volume", self.volume)
      }, 250)
      document.onpointerup = () => {
        document.onpointerup = null
        target.onpointermove = null
      }
    },
    cleanurl:
      // debounce(
      self => {
        const urlid = self.$youtube.getIdFromUrl(self.urlinput)
        if (urlid) self.urlinput = `https://youtu.be/${urlid}`
      },
    // , 500)
    async overlay_click() {
      let update = [this.id]
      if ((await this.p.getPlayerState()) === 1)
        update = [...update, await this.p.getCurrentTime()]
      this.socket.emit("playpause", update)
    },
    playurl() {
      if (this.urlinput === "") return this.socket.emit("stop", [this.id])
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

<style lang="stylus" scoped>
.room
  height: 100%
  width: 100%
  display: flex
  justify-content: center

  .people
    position: absolute
    top: 16px
    right: 16px

    .person
      font-family: "Roboto Mono", monospace
      font-style: italic
      font-weight: 400
      opacity: 0.5
      text-align: right

  >.player
    display: flex
    flex-direction: column
    align-items: center
    padding-top: 32px

    >button
      font-size: 4em
      max-height: 0
      margin: 0
      opacity: 0
      padding: 0

    >.url
      width: 75%
      display: flex
      justify-content: center
      align-items: center
      transition: 1s

      >button
        box-shadow: none !important
        max-width: var(--max-width)

      >.input
        flex-grow: 1

        >input
          text-align: center
          font-size: 1.5em
          font-family: "Roboto Mono", monospace
          color: rgba(255, 255, 255, 0.5)
          transition: 0.5s ease
          font-weight: lighter

          &:focus, &.validlink
            color: #FFF

    >.video
      width: 1280px
      height: 720px
      position: relative
      border-radius: 5px
      transition: 1s cubic-bezier(0.77, 0, 0.175, 1)
      opacity: 1

      @media only screen and (max-width: 1300px)
        width: 928px
        height: 522px

      >.volume
        position: absolute
        left: calc(100% - 5px)
        bottom: 0
        height: 100%
        width: 25px
        display: flex
        align-items: flex-end
        background: transparent
        z-index: 0

        >.bar
          transition: 0.25s
          width: 7px
          height: 20%
          background: #FFF
          pointer-events: none
          border-radius: 0 5px 5px 0

        &:hover
          >.bar
            width: 10px

      >.progress
        position: absolute
        bottom: 0
        height: 25px
        width: 100%
        z-index: 14
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
        top: 0
        left: 0
        z-index: 10
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

      >.player
        overflow: hidden
        border-radius: 5px
        height: 720px
        z-index: 1
        position: absolute
        height: 100%
        width: 100%
        top: 0
        left: 0

        // pointer-events: none
        >iframe
          z-index: 1

      &.ispaused
        box-shadow: 0 0 0 3px #FFF

        >.overlay
          opacity: 1

        >.volume>.bar
          box-shadow: 0 -1px 0 1px black

    &.novideo
      >button
        max-height: var(--max-height)
        opacity: 1
        margin: 75px 0
        padding: 2.5px 7.5px

      >.url
        width: 95%
        padding-top: 25vh

        >.input
          >input
            font-size: 4em

          >span
            background: #FFF

        >button
          max-width: 0
          margin: 0
          padding: 0
          opacity: 0

      >.video
        // height: 0
        box-shadow: none
        opacity: 0

        >.overlay
          opacity: 0
</style>

