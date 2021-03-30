import type { VideoMetadata } from "$/room"

import Resync, { SocketOff } from "@/resync"

import {
  computed,
  defineComponent,
  h,
  inject,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue"

import debug from "debug"
const log = debug("resync:videoplayer")
const logRemote = log.extend("remote")
const logLocal = log.extend("local")

const wait = (t: number): Promise<void> => new Promise(r => setTimeout(r, t))

export default defineComponent({
  name: "VideoPlayer",
  emits: ["metadata"],
  setup(_, { emit }) {
    const resync = inject<Resync>("resync")
    if (!resync) throw new Error("resync injection failed")

    const src = computed(() => resync.state.value.source?.video?.[0].url)
    const video = ref<null | HTMLVideoElement>(null)
    const muted = ref(false)
    const autoplay = ref(false)

    const offHandlers: SocketOff[] = []

    onMounted(async () => {
      if (!video.value) throw new Error("video ref is null")
      resync.currentTime = () => video.value?.currentTime ?? NaN
      resync.duration = () => video.value?.duration ?? NaN

      video.value.volume = resync.muted.value ? 0 : resync.volume.value

      if (resync.state.value.paused) {
        autoplay.value = false
        video.value.currentTime = resync.state.value.lastSeekedTo
      } else {
        autoplay.value = true
        resync.resync()
      }

      const onPlaybackError = async (err: DOMException): Promise<any> => {
        const error = log.extend("error")
        error(`${err.name}: ${err.message}`)

        if (!muted.value) {
          error("trying to play the video muted")

          muted.value = true
          await wait(100)
          return video.value
            ?.play()
            .catch(onPlaybackError)
            .then(() => {
              // TODO show unmute button
            })
        }

        error("playback still failed when muted")
        const reason = err.message.split(". ")[0]
        const { name } = err
        resync.playbackError({ reason, name }, resync.currentTime())
      }

      const play = () => {
        logRemote("onResume")
        autoplay.value = true
        muted.value = false
        video.value?.play().catch(onPlaybackError)
      }

      const offPause = resync.onPause(() => {
        logRemote("onPause")
        autoplay.value = false
        video.value?.pause()
      })
      offHandlers.push(offPause)

      const offResume = resync.onResume(play)
      offHandlers.push(offResume)

      const offSeekTo = resync.onSeekTo(seconds => {
        logRemote(`onSeekTo: ${seconds}`)
        if (!video.value) throw new Error("video ref is null (at onSeekTo)")

        video.value.currentTime = seconds
      })
      offHandlers.push(offSeekTo)

      const offRequestTime = resync.onRequestTime(callback => {
        logRemote(`onRequestTime`)
        callback(resync.currentTime())
      })
      offHandlers.push(offRequestTime)

      const offSource = resync.onSource(play)
      offHandlers.push(offSource)

      const offVolume = watch(resync.volume, volume => {
        video.value && (video.value.volume = volume)
      })
      offHandlers.push(offVolume)

      const offMuted = watch(resync.muted, muted => {
        video.value && (video.value.volume = muted ? 0 : resync.volume.value)
      })
      offHandlers.push(offMuted)

      video.value.onpause = () => {
        resync.paused.value = true
        logLocal(`paused: ${resync.paused.value}`)
      }
      video.value.onplay = () => {
        resync.paused.value = false
        logLocal(`paused: ${resync.paused.value}`)
      }
      video.value.onended = () => {
        logLocal(`ended`)
        resync.paused.value = true
      }

      video.value.onloadedmetadata = () => {
        if (!video.value) throw new Error("video ref is null")
        const { videoHeight, videoWidth } = video.value
        const metadata: VideoMetadata = { videoHeight, videoWidth }

        emit("metadata", metadata)
      }

      video.value.onclick = () =>
        resync.paused.value ? resync.resume() : resync.pause(resync.currentTime())

      if (navigator.mediaSession) {
        navigator.mediaSession.setActionHandler("play", () => resync.resume())
        navigator.mediaSession.setActionHandler("pause", () =>
          resync.pause(resync.currentTime())
        )
      }
    })

    onBeforeUnmount(() => offHandlers.forEach(off => off()))

    return () => {
      if (src.value)
        return h("video", {
          src: src.value,
          ref: video,
          disablePictureInPicture: true,
          preload: "auto",
          muted: muted.value,
          autoplay: autoplay.value,
        })
      else return
    }
  },
})
