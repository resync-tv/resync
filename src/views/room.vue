<template>
  <div class="room">
    <div class="player" :class="{ novideo: urlid === '' }">
      <div class="url" :class="{ hidequeue: hidequeue || !queue.length }">
        <div class="input">
          <input
            v-model="urlinput"
            type="text"
            placeholder="url"
            autocomplete="off"
            autocorrect="off"
            ref="urlinput"
            autocapitalize="off"
            spellcheck="false"
            :class="{ validlink }"
            @keydown.enter="playurl"
            @click.right="paste"
          />
          <span></span>
        </div>
        <button
          class="flat"
          title="right click to add to queue"
          ref="searchbutton"
          @click.right="addqueue"
          @click="playurl"
          :class="{ disabled: !validlink }"
        >play</button>
      </div>
      <button
        class="flat"
        title="right click to add to queue"
        ref="searchbutton1"
        @click.right="addqueue"
        @click="playurl"
        :class="{ disabled: !validlink }"
      >play</button>
      <div
        class="video"
        :class="{ ispaused, hidequeue: hidequeue || !queue.length, 'no-overlay': noOverlay }"
        ref="video"
      >
        <div class="progress" @pointerdown="progress_click">
          <div class="bar" :style="{ width: `${progress * 100}%` }"></div>
        </div>
        <div
          class="volume"
          @pointerdown="volume_click"
          :class="{ hidequeue: hidequeue || !queue.length }"
        >
          <div class="bar" :style="{ height: `${volume}%` }" :class="{ notrans: volumechanging }"></div>
        </div>
        <div class="overlay" @click="overlay_click" ref="overlay">
          <h1 class="paused">paused</h1>
          <i class="material-icons fullscreen">{{ fullscreen ? 'fullscreen_exit' : 'fullscreen' }}</i>
        </div>
        <div class="player">
          <youtube
            :video-id="urlid"
            ref="youtube"
            :player-vars="pv"
            width="100%"
            height="100%"
            :fitParent="true"
            @playing="playing"
            @paused="paused"
            @ended="ended"
          ></youtube>
        </div>
        <div class="queue" :class="{ hidequeue: hidequeue || !queue.length }">
          <transition-group class="wrap" name="video" tag="div">
            <div
              class="video"
              v-for="(id, index) in queue"
              :key="queue.filter((e) =&gt; e === id).length &gt; 1 ? id + index : id"
            >
              <img
                @click="playqueue(index)"
                @click.right="removequeue($event, index)"
                :src="`https://i.ytimg.com/vi/${id}/mqdefault.jpg`"
                draggable="false"
              />
            </div>
          </transition-group>
          <i
            class="material-icons volume"
            @click="hidequeue = true"
            :class="{ queueempty: queue.length === 0 }"
          >volume_up</i>
          <i
            class="material-icons playlist"
            @click="hidequeue = false"
            :class="{ queueempty: queue.length === 0 }"
          >playlist_play</i>
        </div>
      </div>
      <div class="grow"></div>
    </div>
    <transition-group class="people" name="person" tag="div">
      <div class="person" v-for="person in people" :key="person[0]">{{ person[1] }}</div>
    </transition-group>
  </div>
</template>

<script>
import ls from "local-storage"
const debounce = (fn, ms = 0) => {
  let timeoutId
  return function (...args) {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn.apply(this, args), ms)
  }
}
const throttle = (fn, wait) => {
  let inThrottle, lastFn, lastTime
  return function () {
    const context = this,
      args = arguments
    if (!inThrottle) {
      fn.apply(context, args)
      lastTime = Date.now()
      inThrottle = true
    } else {
      clearTimeout(lastFn)
      lastFn = setTimeout(function () {
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
    noOverlay: ls("w2g-preferences").noOverlay,
    disableTimestamp: ls("w2g-preferences").disableTimestamp,
    hidequeue: true,
    queue: [],
    hasended: false,
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
    progress: throttle(function (n) {
      this.cleanurl(this)
    }, 250),
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

      if (keyCode === 83) {
        self.$refs.urlinput.focus()
      } else if (keyCode === 78) {
        self.playqueue(0)
      } else if (keyCode === 37)
        self.socket.emit("seekTo", [self.id, (await self.p.getCurrentTime()) - 5])
      else if (keyCode === 39)
        self.socket.emit("seekTo", [self.id, (await self.p.getCurrentTime()) + 5])
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
      } else if (keyCode === 81 || keyCode === 86) {
        self.hidequeue = !self.hidequeue
      }
    }

    const update = async ({ urlid, time, playing, people, queue }) => {
      const { p } = self
      if (urlid) {
        self.urlid = urlid
        self.hasended = false
        p.loadVideoById({
          videoId: urlid,
          startSeconds: 0,
          suggestedQuality: "hd720",
        })
        self.urlinput = `youtu.be/${urlid}`
        if (playing) self.pv.autoplay = 1
      } else if (urlid === "") {
        self.urlid = ""
        self.urlinput = ""
      }

      if (typeof time === "number" && this.lastSkippedTo !== time) {
        p.seekTo(time)
        self.play_loop()
      }

      if (typeof people === "object") self.people = Object.entries(people).reverse()

      if (typeof queue === "object") {
        self.queue = queue
        if (queue.length > 0) self.hidequeue = false
      }

      if (typeof playing === "boolean") {
        if (playing === ((await this.p.getPlayerState()) === 1)) return
        self.ignoreNextStateChange = true
        if (playing) await p.playVideo()
        else await p.pauseVideo()
      }
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
    ended() {
      this.hasended = true
      this.socket.emit("ended", [this.id])
    },
    playqueue(index) {
      this.socket.emit("playqueue", [this.id, index])
    },
    addqueue(e) {
      e.preventDefault()
      if (this.urlinput === "") return this.socket.emit("stop", [this.id])
      if (!this.$youtube.getIdFromUrl(this.urlinput)) return
      this.socket.emit("addqueue", [this.id, this.$youtube.getIdFromUrl(this.urlinput)])
      this.cleanurl(this)
    },
    removequeue(e, index) {
      e.preventDefault()
      this.socket.emit("removequeue", [this.id, index])
    },
    paste(e) {
      const self = this
      e.preventDefault()
      navigator.clipboard
        .readText()
        .then(text => {
          self.urlinput = text
          const urlid = self.$youtube.getIdFromUrl(self.urlinput)
          self.cleanurl(self)
          if (urlid) {
            if (e.shiftKey) self.addqueue(e)
            else self.playurl(e)
          }
        })
        .catch(console.log)
    },
    async progress_click(e) {
      const time = (e.offsetX / e.target.offsetWidth) * (await this.p.getDuration())
      this.socket.emit("seekTo", [this.id, time])
      this.play_loop()
    },
    volume_click({ offsetY, target }) {
      const self = this
      self.volumechanging = true
      self.volume = (1 - offsetY / target.offsetHeight) * 100
      self.p.setVolume(self.volume)
      ls("volume", self.volume)

      document.onpointermove = throttle(({ clientY, offsetY: oy, target: t }) => {
        self.volume = (1 - oy / t.offsetHeight) * 100
        self.p.setVolume(self.volume)
        ls("volume", self.volume)
      }, 1000 / 60)
      document.onpointerup = () => {
        self.volumechanging = false
        document.onpointerup = null
        document.onpointermove = null
      }
    },
    cleanurl: async self => {
      // why the fuck is vue itself an arg why was i like this
      const urlid = self.urlid //self.$youtube.getIdFromUrl(self.urlinput)
      const current = Math.floor(self.progress * (await self.p.getDuration()))
      if (urlid)
        if (isNaN(current) || self.disableTimestamp) self.urlinput = `youtu.be/${urlid}`
        else self.urlinput = `youtu.be/${urlid}?t=${current}`
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
      if (e && e.target.classList.contains("fullscreen")) return this.toggle_fullscreen()

      if ((await this.p.getPlayerState()) === 1) {
        const current = await this.p.getCurrentTime()
        this.lastSkippedTo = current
        update = [...update, current]
      }

      this.ignoreNextStateChange = true
      if (this.ispaused) this.socket.emit("resume", update)
      else this.socket.emit("pause", update)
    },
    playurl(e) {
      if (e.shiftKey) return this.addqueue(e)
      if (this.urlinput === "") return this.socket.emit("stop", [this.id])
      if (!this.$youtube.getIdFromUrl(this.urlinput)) return
      this.newVideo = true
      this.socket.emit("play", [this.id, this.$youtube.getIdFromUrl(this.urlinput)])
    },
    async play_loop() {
      this.progress = (await this.p.getCurrentTime()) / (await this.p.getDuration())

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

      if (this.ignoreNextStateChange) return (this.ignoreNextStateChange = false)

      if (!this.hasended) this.socket.emit("resume", [this.id])
      else this.hasended = false
    },
    async paused() {
      if (this.ispaused) return
      this.ispaused = true

      if (this.ignoreNextStateChange) return (this.ignoreNextStateChange = false)

      this.socket.emit("pause", [this.id, await this.p.getCurrentTime()])
    },
  },
}
</script>

<style lang="stylus">
$breakW = 1300px
$breakH = 850px
$largeW = 1280px
$largeH = 720px
$smallW = 928px
$smallH = 522px
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
    justify-content: center

    >button
      font-size: 4em
      max-height: 0
      margin: 0
      opacity: 0
      padding: 0

    >.url
      width: calc(75% - 95px)
      display: flex
      justify-content: center
      align-items: center
      transition: 1000ms $easeInOut
      padding-top: 16px

      &.hidequeue
        width: 75%

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
      width: $largeW
      height: $largeH
      max-width: calc(90vw - 95px)
      position: relative
      border-radius: 5px
      transition: 1s $easeInOut
      opacity: 1
      margin-right: 95px
      -webkit-backface-visibility: hidden

      &:fullscreen
        border-radius: 0

      @media only screen and (max-width: $breakW), (max-height: $breakH)
        width: $smallW
        height: $smallH

      &.hidequeue
        margin-right: 0
        max-width: 90vw

      >.volume
        position: absolute
        transition: 1s $easeInOut
        left: calc(100% - 25px)
        bottom: 0
        height: 100%
        width: 25px
        display: flex
        align-items: flex-end
        background: transparent
        z-index: 1

        &.hidequeue
          left: calc(100% - 5px)

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
        background: rgba(0, 0, 0, 0.75)
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

      &.no-overlay>.overlay
        opacity: 0 !important

      >.player
        overflow: hidden
        border-radius: 5px
        height: $largeH
        z-index: 2
        position: absolute
        height: 100%
        width: 100%
        top: 0
        left: 0

        // pointer-events: none
        iframe
          width: 100%
          height: 100%
          z-index: 2

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
        position: absolute
        left: calc(100% + 5px)
        width: 95px
        height: 100%
        z-index: 0
        overflow: hidden
        transition: 1000ms $easeInOut
        transition-delay: 100ms
        overflow: hidden
        display: flex
        align-items: center
        flex-direction: column

        >.wrap
          opacity: 1
          width: 95px
          transition: 1000ms $easeInOut
          transition-delay: 100ms
          max-height: calc(100% - 24px)
          overflow-y: scroll
          overflow-x: hidden
          scrollbar-width: none

          &::-webkit-scrollbar
            width: 0

          &:after
            content: ""
            position: absolute
            bottom: 24px
            width: 100%
            height: 25%
            background: linear-gradient(to top, #000 0, transparent 100%)
            pointer-events: none

          >.video
            display: flex
            justify-content: center
            padding-bottom: 5px
            height: 50px
            overflow: hidden
            opacity: 1

            &-enter-active, &-leave-active
              transition: 1s $easeInOut

            &-enter, &-leave-to
              height: 0
              opacity: 0
              padding-bottom: 0

            >img
              height: 50px
              border-radius: 5px
              cursor: pointer

        >i.material-icons
          position: absolute
          bottom: 0
          width: 24px
          opacity: 1
          transition: 1000ms $easeInOut
          cursor: pointer
          z-index: 3

          &.playlist
            width: 0
            opacity: 0
            pointer-events: none

          &.queueempty
            width: 0 !important
            opacity: 0 !important
            pointer-events: none !important

        &.hidequeue
          width: 24px
          left: calc(100% + 20px)

          >.wrap
            width: 0
            opacity: 0

          >i.playlist
            width: 24px
            opacity: 1
            pointer-events: unset

          >i.volume
            width: 0
            opacity: 0
            pointer-events: none

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

