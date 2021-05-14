import type { MediaRawSource } from "../types/mediaSource"

import ytdl from "ytdl-core"
import { average } from "./util"

import debug from "debug"
const log = debug("resync:youtube")

const urlExpire = (url: string): number => {
  const { searchParams } = new URL(url)
  const expires = searchParams.get("expire")

  if (!expires) return NaN
  else return Number(expires)
}

const transformFormat = (format: ytdl.videoFormat): MediaRawSource => {
  return {
    url: format.url,
    quality: format.hasVideo ? format.qualityLabel : `${format.audioBitrate} kbps`,
  }
}

interface Cached {
  formats: ytdl.videoFormat[]
  expires: Date
  videoDetails: ytdl.MoreVideoDetails
}
const cached: Record<string, Cached> = {}

const fetchVideo = async (source: string) => {
  const id = ytdl.getVideoID(source)

  if (cached[id]) {
    log(`cached formats found for ${id}`)

    if (new Date() > cached[id].expires) delete cached[id]
    else return cached[id]
  }

  log(`fetching formats for ${id}`)
  const { formats, videoDetails } = await ytdl.getInfo(id)
  const averageExpire = average(...formats.map(f => urlExpire(f.url)).filter(e => !isNaN(e)))
  const expires = new Date(averageExpire * 1e3)

  cached[id] = { formats, videoDetails, expires }

  return cached[id]
}

export const getCombinedStream = async (source: string): Promise<MediaRawSource[]> => {
  const { formats } = await fetchVideo(source)

  const combined = formats.filter(f => f.hasAudio && f.hasVideo)
  const sorted = combined.sort((a, b) => (b.height || 0) - (a.height || 0))

  return sorted.map(transformFormat)
}

export const getInfo = async (source: string): Promise<ytdl.MoreVideoDetails> => {
  const { videoDetails } = await fetchVideo(source)
  return videoDetails
}

interface SeperateStreams {
  audio: MediaRawSource[]
  video: MediaRawSource[]
}

export const getSeperateStreams = async (source: string): Promise<SeperateStreams> => {
  const { formats } = await fetchVideo(source)

  const audios = formats.filter(f => f.hasAudio && !f.hasVideo)
  const audio = audios.sort((a, b) => (b.audioBitrate || 0) - (a.audioBitrate || 0))

  const videos = formats.filter(f => !f.hasAudio && f.hasVideo)
  const video = videos.sort((a, b) => (b.height || 0) - (a.height || 0))

  return {
    audio: audio.map(transformFormat),
    video: video.map(transformFormat),
  }
}
