import type { MediaImage } from "/$/MediaSession"
import type { MediaSourceAny } from "/$/mediaSource"

export const setMetadata = (data: MediaSourceAny, room?: string): void => {
  if (!window.navigator.mediaSession || !window.MediaMetadata) return

  const artwork: MediaImage[] = []
  if (data.thumb) artwork.push({ src: data.thumb })

  window.navigator.mediaSession.metadata = new window.MediaMetadata({
    title: data.title,
    artist: data.uploader,
    album: room ?? "resync.tv",
    artwork,
  })
}
