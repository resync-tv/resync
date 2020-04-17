<template lang="pug">
.room
  .player(:class="{ novideo: urlid === '' }")
    .url
      .input
        input(v-model="urlinput" type="text" placeholder="url" autocomplete="off" autocorrect="off" ref="urlinput"
          autocapitalize="off" spellcheck="false" :class="{ validlink }" @keydown.enter="playurl" @click.right="paste")
        span
      button.flat(ref="searchbutton" @click="playurl" :class="{ disabled: !validlink}") play
    button.flat(ref="searchbutton1" @click="playurl" :class="{ disabled: !validlink}") play
    .video(:class="{ ispaused }" ref="video")

      .progress(@pointerdown="progress_click")
        .bar(:style="{width: `${progress * 100}%`}")

      .volume(@pointerdown="volume_click")
        .bar(:style="{height: `${volume}%`}" :class="{ notrans: volumechanging }")

      .overlay(@click="overlay_click" ref="overlay")
        h1.paused paused
        i.material-icons.fullscreen {{fullscreen ? "fullscreen_exit" : "fullscreen"}}

      .player
        youtube(:video-id="urlid" ref="youtube" :player-vars="pv" width="100%" height="100%"
          :fitParent="true" @playing="playing" @paused="paused")

    .queue(v-show="!hidequeue")
      .wrap
        .video
          .thumb
            img(src="https://i.ytimg.com/vi/aNycEsAN5ys/mqdefault.jpg")
          .info
            .title Try to break this tablet. I DARE you - Dell Latitude Rugged Tablet
            .uploader ShortCircuit
        .video
          .thumb
            img(src="https://i.ytimg.com/vi/Yv3v9SsoDMw/mqdefault.jpg")
          .info
            .title You Suck at Producing: Warmth
            .uploader You Suck at Producing
        .video(v-for="i in 5")
          .thumb
            img(src="https://i.ytimg.com/vi/If1v7xlg_9c/mqdefault.jpg")
          .info
            .title MKBHD Full Interview - His Expanding Tech Empire, 10 Mil Subscribers & Are We At "Peak Smartphone"? MKBHD Full Interview - His Expanding Tech Empire, 10 Mil Subscribers & Are We At "Peak Smartphone"?
            .uploader That Creative Life Podcast

    .grow
  transition-group(name="person" tag="div").people
    .person(v-for="person in people" :key="person[0]") {{person[1]}}
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
    hidequeue: true,
    urlid: "",
    urlinput: "",
    progress: 0,
    volume: ls("volume") || 50,
    volumechanging: false,
    ispaused: true,
    people: [],
    fullscreen: false,
    lastSkippedTo: 0,
    newVideo: false,
    pv: {
      autoplay: 0,
      controls: 0,
      disablekb: 1,
      fs: 0,
      iv_load_policy: 3,
      loop: 0,
      modestbranding: 1,
      rel: 0,
      start: 0,
    },
    ignoreNextStateChange: false,
  }),
  computed: {
    p() {
      return this.$refs.youtube.player || false
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
      if (target.nodeName === "INPUT")
        if (keyCode === 27) target.blur()
        else return

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
      } else if (keyCode === 70) {
        self.toggle_fullscreen()
      }
    }

    const update = async ({ urlid, time, playing, people }) => {
      const { p } = self
      if (urlid) {
        self.urlid = urlid
        p.loadVideoById({
          videoId: urlid,
          startSeconds: 0,
          suggestedQuality: "hd720",
        })
        self.urlinput = `https://youtu.be/${urlid}`
        if (playing) self.pv.autoplay = 1
      } else if (urlid === "") {
        self.urlid = ""
      }
      if (typeof time === "number") {
        if (this.lastSkippedTo !== time) {
          p.seekTo(time)
          self.play_loop()
        }
      }
      if (typeof playing === "boolean") {
        if (playing === ((await this.p.getPlayerState()) === 1)) return
        self.ignoreNextStateChange = true
        if (playing) await p.playVideo()
        else await p.pauseVideo()
      }
      if (typeof people === "object")
        self.people = Object.entries(people).reverse()
    }

    const { name } = self.$store.state

    self.socket.emit("joinroom", { room: self.id, name }, update)
    self.socket.on("update", update)
  },
  beforeDestroy() {
    window.onkeydown = null
    this.socket.off("upadate")
    this.socket.emit("leaveroom")
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
      self.volumechanging = true
      self.volume = (1 - offsetY / target.offsetHeight) * 100
      self.p.setVolume(self.volume)
      ls("volume", self.volume)

      document.onpointermove = throttle(
        ({ clientY, offsetY: oy, target: t }) => {
          self.volume = (1 - oy / t.offsetHeight) * 100
          self.p.setVolume(self.volume)
          ls("volume", self.volume)
        },
        1000 / 60
      )
      document.onpointerup = () => {
        self.volumechanging = false
        document.onpointerup = null
        document.onpointermove = null
      }
    },
    cleanurl: self => {
      const urlid = self.$youtube.getIdFromUrl(self.urlinput)
      if (urlid) self.urlinput = `https://youtu.be/${urlid}`
    },
    async toggle_fullscreen() {
      const self = this
      if (!self.fullscreen) {
        await self.$refs.video.requestFullscreen()
        self.fullscreen = true
      } else {
        await document.exitFullscreen()
        self.fullscreen = false
      }
    },
    async overlay_click(e) {
      let update = [this.id]
      if (e && e.target.classList.contains("fullscreen"))
        return this.toggle_fullscreen()

      if ((await this.p.getPlayerState()) === 1) {
        const current = await this.p.getCurrentTime()
        this.lastSkippedTo = current
        update = [...update, current]
      }

      this.ignoreNextStateChange = true
      if (this.ispaused) this.socket.emit("resume", update)
      else this.socket.emit("pause", update)
    },
    async playerStateChange(n) {},
    playurl() {
      if (this.urlinput === "") return this.socket.emit("stop", [this.id])
      if (!this.$youtube.getIdFromUrl(this.urlinput)) return
      this.newVideo = true
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
    async playing() {
      this.play_loop()
      this.p.setVolume(this.volume)
      this.ispaused = false
      if (this.newVideo) {
        this.newVideo = false
        if ((await this.p.getCurrentTime()) !== 0) this.p.seekTo(0)
      }

      if (this.ignoreNextStateChange)
        return (this.ignoreNextStateChange = false)

      this.socket.emit("resume", [this.id])
    },
    async paused() {
      if (this.ispaused) return
      this.ispaused = true

      if (this.ignoreNextStateChange)
        return (this.ignoreNextStateChange = false)

      this.socket.emit("pause", [this.id, await this.p.getCurrentTime()])
    },
  },
}
</script>

<style lang="stylus">
$breakW = 1300px
$breakH = 850px
$easeInOut = cubic-bezier(0.76, 0, 0.24, 1)

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
      height: 1.25em
      overflow: hidden
      margin-right: 0

      &-enter-active, &-leave-active
        transition: 1s $easeInOut

      &-enter, &-leave-to
        height: 0
        opacity: 0
        margin-right: -1em

  >.player
    display: flex
    flex-direction: column
    align-items: center
    // padding-top: 32px
    justify-content: center

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
      padding-top: 16px

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
      max-width: 95vw
      position: relative
      border-radius: 5px
      transition: 1s $easeInOut
      opacity: 1

      &:fullscreen
        border-radius: 0

      @media only screen and (max-width: $breakW), (max-height: $breakH)
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
          transition: 0.2s
          transition-property: width, background-color, height
          width: 7px
          height: 50%
          background-color: #FFF
          pointer-events: none
          border-radius: 0 5px 5px 0

          &.notrans
            transition-property: width, background-color
            width: 10px

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
          transition: 0.2s
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

        >i
          position: absolute
          bottom: 25px
          right: 25px
          font-size: 2em
          text-shadow: 0 0 5px black
          pointer-events: none

        >h1
          color: rgba(255, 255, 255, 0.75)
          font-size: 3em
          user-select: none
          pointer-events: none
          padding: 0 1em
          background: -webkit-linear-gradient(top, rgba(255, 255, 255, 0.125) 0, rgba(255, 255, 255, 0.25) 25%, rgba(255, 255, 255, 1) 100%)
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
        iframe
          width: 100%
          height: 100%
          z-index: 1

      &.ispaused
        box-shadow: 0 0 0 3px #FFF

        >.overlay
          opacity: 1

          >i
            cursor: pointer
            pointer-events: auto

        >.volume>.bar
          box-shadow: 0 -1px 0 1px black
          background-color: #ccc

    >.queue
      transition: 1s $easeInOut
      max-width: 92.5vw
      width: 1250px
      // height: 6rem
      position: relative
      overflow: hidden
      margin-top: 8px
      height: calc(100vh - 875px)

      @media only screen and (max-width: $breakW), (max-height: $breakH)
        height: calc(100vh - 675px)
        width: 900px

      &:after
        content: ""
        position: absolute
        bottom: 0
        width: 100%
        height: 1rem
        background: linear-gradient(to top, #000 0, transparent 100%)

      >.wrap
        overflow-y: scroll
        overflow-x: hidden
        height: 100%
        position: relative
        width: 100%

        &::-webkit-scrollbar-track
          background-color: #111

        &::-webkit-scrollbar
          width: 4px
          background-color: #111

        &::-webkit-scrollbar-thumb, .g-scrollbar
          background-color: #FFF

        >.video
          display: flex
          align-items: center
          margin-bottom: 4px
          cursor: pointer

          &:last-of-type
            margin-bottom: 1rem

          .thumb > img
            height: 50px
            border-radius: 5px
            margin-right: 8px

          .info
            max-width: calc(100% - 100px)

            .title, .uploader
              font-family: "Roboto Mono", monospace
              font-size: 0.85em
              white-space: nowrap
              overflow: hidden
              text-overflow: ellipsis

            .uploader
              color: rgba(255, 255, 255, 0.5)

    >.grow
      transition: 1s $easeInOut
      flex-grow: 1

    &.novideo
      // height: 0
      >button
        max-height: var(--max-height)
        opacity: 1
        margin-top: 25px
        padding: 0

      >.url
        width: 95%
        padding-top: 0

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
        height: 0

        >.overlay
          opacity: 0

      >.grow
        flex-grow: 0
</style>

