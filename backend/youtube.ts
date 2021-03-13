import type { MediaSource } from "../types/mediaSource"

import ytdl from "ytdl-core"
import { dev, average } from "./util"

const urlExpire = (url: string): number => {
  const { searchParams } = new URL(url)
  const expires = searchParams.get("expire")
  if (!expires) throw new Error("no expire parameter found in stream url")

  return Number(expires)
}

const transformFormat = (format: ytdl.videoFormat): MediaSource => {
  return {
    url: format.url,
    quality: format.hasVideo ? format.qualityLabel : `${format.audioBitrate} kbps`,
  }
}

interface Cached {
  formats: ytdl.videoFormat[]
  expires: Date
}
const cached: Record<string, Cached> = {}

const fetchFormats = async (source: string) => {
  const id = ytdl.getVideoID(source)

  if (cached[id]) {
    dev.log(`cached formats found for ${id}`)

    if (new Date() > cached[id].expires) delete cached[id]
    else return cached[id]
  }

  dev.log(`fetching formats for ${id}`)
  const { formats } = await ytdl.getInfo(id)
  const averageExpire = average(...formats.map(f => urlExpire(f.url)))
  const expires = new Date(averageExpire * 1e3)

  cached[id] = { formats, expires }

  return cached[id]
}

export const getCombinedStream = async (source: string): Promise<MediaSource> => {
  const { formats } = await fetchFormats(source)

  const combined = formats.filter(f => f.hasAudio && f.hasVideo)
  const [best] = combined.sort((a, b) => (b.height || 0) - (a.height || 0))

  return transformFormat(best)
}

interface SeperateStreams {
  audio: MediaSource[]
  video: MediaSource[]
}

export const getSeperateStreams = async (source: string): Promise<SeperateStreams> => {
  const { formats } = await fetchFormats(source)

  const audios = formats.filter(f => f.hasAudio && !f.hasVideo)
  const audio = audios.sort((a, b) => (b.audioBitrate || 0) - (a.audioBitrate || 0))

  const videos = formats.filter(f => !f.hasAudio && f.hasVideo)
  const video = videos.sort((a, b) => (b.height || 0) - (a.height || 0))

  return {
    audio: audio.map(f => transformFormat(f)),
    video: video.map(f => transformFormat(f)),
  }
}
