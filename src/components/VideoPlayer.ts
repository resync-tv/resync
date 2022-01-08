import type { VideoMetadata } from "$/room"

import Resync, { SocketOff } from "@/resync"
import shortcuts from "@/shortcuts"
import { bufferedStub, debug } from "@/util"

import {
  computed,
  defineComponent,
  h,
  inject,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue"

const log = debug("videoplayer")
const logRemote = log.extend("remote")
const logLocal = log.extend("local")

export default defineComponent({
  name: "VideoPlayer",
  emits: ["metadata", "fullscreen"],
  setup(_, { emit }) {
    const resync = inject<Resync>("resync")
    if (!resync) throw new Error("resync injection failed")

    const delay = 300
    let clicks = 0
    let singleClickTimeout: NodeJS.Timeout
    const singleClick = () => {
      resync.paused.value ? resync.resume() : resync.pause(resync.currentTime())
      clicks = 0
    }
    const doubleClick = () => {
      emit("fullscreen")
    }

    const src = computed(() => resync.state.value.source?.video?.[0]?.url)
    const video = ref<null | HTMLVideoElement>(null)
    const muted = ref(false)
    const autoplay = ref(false)

    const requireUserInteraction = inject<() => Promise<void>>("requireUserInteraction")
    if (!requireUserInteraction) throw new Error("requireUserInteraction injection failed")

    const offHandlers: SocketOff[] = []

    onMounted(async () => {
      if (!video.value) throw new Error("video ref is null")
      resync.currentTime = () => video.value?.currentTime ?? NaN
      resync.duration = () => video.value?.duration ?? NaN
      resync.buffered = () => video.value?.buffered ?? bufferedStub
      resync.blocked = () => {
        const segments = computed(() => resync.state.value.source?.segments).value
        return segments?.map(segment => [segment.startTime/resync.duration(), segment.endTime/resync.duration()])
      }

      video.value.volume = resync.muted.value ? 0 : resync.volume.value

      if (resync.state.value.paused) {
        autoplay.value = false
        video.value.currentTime = resync.state.value.lastSeekedTo
      } else {
        autoplay.value = true
        resync.resync()
      }

      const play = async () => {
        logRemote("onResume")
        autoplay.value = true
        muted.value = false
        await nextTick()
        video.value?.play().catch(onPlaybackError)
      }

      const onPlaybackError = async (err: DOMException): Promise<any> => {
        const error = log.extend("error")
        error(`${err.name}: ${err.message}`)

        if (!muted.value) {
          error("trying to play the video muted")

          muted.value = true
          await nextTick()
          return video.value
            ?.play()
            .catch(onPlaybackError)
            .then(async () => {
              error("muted video played successfully")
              if (["NotAllowedError"].includes(err.name)) {
                await requireUserInteraction()
                muted.value = false
              }
            })
        }

        error("playback still failed when muted")
        const [reason] = err.message.split(". ")
        const { name } = err
        resync.playbackError({ reason, name }, resync.currentTime())
      }

      let offShortcuts: () => void
      if (src.value) offShortcuts = shortcuts(resync)
      const offShortcutsRef = () => offShortcuts()

      offHandlers.push(
        resync.onPause(() => {
          logRemote("onPause")
          autoplay.value = false
          video.value?.pause()
        }),
        resync.onResume(play),
        resync.onSeekTo(seconds => {
          logRemote(`onSeekTo: ${seconds}`)
          if (!video.value) throw new Error("video ref is null (at onSeekTo)")

          video.value.currentTime = seconds
        }),
        resync.onRequestTime(callback => {
          logRemote(`onRequestTime`)
          callback(resync.currentTime())
        }),
        resync.onSource(() => {
          if (!video.value) throw new Error("video ref is null")
          autoplay.value = false

          video.value.oncanplaythrough = () => {
            resync.loaded()

            if (!video.value) throw new Error("video ref is null")
            video.value.oncanplaythrough = null
          }
        }),
        watch(resync.volume, volume => {
          video.value && (video.value.volume = volume)
        }),
        watch(resync.muted, muted => {
          video.value && (video.value.volume = muted ? 0 : resync.volume.value)
        }),
        watch(src, () => {
          log(src.value)

          if (src.value) offShortcuts = shortcuts(resync)
          else offShortcutsRef()
        }),
        offShortcutsRef
      )

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
        resync.finished()
        resync.paused.value = true
      }

      video.value.onloadedmetadata = () => {
        if (!video.value) throw new Error("video ref is null")
        const { videoHeight, videoWidth } = video.value
        const metadata: VideoMetadata = { videoHeight, videoWidth }

        emit("metadata", metadata)
      }

      video.value.onclick = () => {
        clicks++
        if (clicks === 1) {
          singleClickTimeout = setTimeout(singleClick, delay)
        } else {
          if (singleClickTimeout) clearTimeout(singleClickTimeout)
          clicks = 0
          doubleClick()
        }
      }
      video.value.oncontextmenu = e => e.preventDefault()
    })

    onBeforeUnmount(() => offHandlers.forEach(off => off()))

    return () => {
      return h("video", {
        src: src.value,
        ref: video,
        disablePictureInPicture: true,
        preload: "auto",
        muted: muted.value,
        autoplay: autoplay.value,
      })
    }
  },
})
