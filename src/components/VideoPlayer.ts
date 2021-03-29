import type { MediaVideo } from "$/mediaSource"
import type { RoomState, VideoMetadata } from "$/room"

import Resync, { SocketOff } from "@/resync"

import {
  computed,
  defineComponent,
  h,
  inject,
  onBeforeUnmount,
  onMounted,
  PropType,
  ref,
  toRefs,
  watch,
} from "vue"

import debug from "debug"
const log = debug("resync:videoplayer")
const logRemote = log.extend("remote")
const logLocal = log.extend("local")

const wait = (t: number): Promise<void> => new Promise(r => setTimeout(r, t))

export default defineComponent({
  name: "VideoPlayer",
  props: {
    state: { type: Object as PropType<RoomState<MediaVideo>>, required: true },
  },
  emits: ["metadata"],
  setup(props, { emit }) {
    const { state } = toRefs(props)
    const { source } = toRefs(state.value)

    const src = computed(() => source.value?.video[0].url)
    const video = ref<null | HTMLVideoElement>(null)
    const muted = ref(false)
    const autoplay = ref(false)

    const offHandlers: SocketOff[] = []

    const resync = inject<Resync>("resync")
    if (!resync) throw new Error("resync injection failed")

    onMounted(async () => {
      if (!video.value) throw new Error("video ref is null")
      resync.currentTime = () => video.value?.currentTime ?? NaN
      resync.duration = () => video.value?.duration ?? NaN
      const stopVolumeWatcher = watch(
        resync.volume,
        volume => video.value && (video.value.volume = volume)
      )
      offHandlers.push(stopVolumeWatcher)

      video.value.volume = resync.volume.value
      if (state.value.paused) {
        autoplay.value = false
        video.value.currentTime = state.value.lastSeekedTo
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

      video.value.onpause = () => {
        logLocal(`paused: ${resync.paused.value}`)
        resync.paused.value = true
      }
      video.value.onplay = () => {
        logLocal(`paused: ${resync.paused.value}`)
        resync.paused.value = false
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

    return () =>
      h("video", {
        src: src.value,
        ref: video,
        disablePictureInPicture: true,
        preload: "auto",
        muted: muted.value,
        autoplay: autoplay.value,
      })
  },
})
