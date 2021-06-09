import type { ResyncSocketBackend } from "$/socket"
import type { MediaSourceAny } from "$/mediaSource"

import ytsr from "ytsr"

import debug from "debug"
import { timestampToDuration } from "./util"
const log = debug("resync:search")

const cacheExpire = 60e3 * 5
const opt: ytsr.Options = {
  limit: 25,
}

const transform = (item: ytsr.Item): MediaSourceAny => {
  const video = item as ytsr.Video

  return {
    duration: timestampToDuration(video.duration ?? "0"),
    originalSource: {
      url: `https://youtu.be/${video.id}`,
      youtubeID: video.id,
    },
    platform: "youtube",
    startFrom: 0,
    title: video.title,
    type: "video",
    thumb: video.bestThumbnail?.url ?? undefined,
    uploader: video.author?.name ?? undefined,
  }
}

export interface Cached {
  result: MediaSourceAny[]
  expire: Date
}
const cached: Record<string, Cached> = {}

const search = async (query: string): Promise<MediaSourceAny[]> => {
  if (new Date() < cached[query]?.expire) {
    log("returning cached search result")
    return cached[query].result
  }

  const filters = await ytsr.getFilters(query)
  const videos = filters.get("Type")?.get("Video")

  if (!videos?.url) throw Error("video filter is falsy")

  const items = await ytsr(videos.url, opt)
  const result = items.items.map(transform)

  cached[query] = {
    expire: new Date(Date.now() + cacheExpire),
    result,
  }

  return result
}

export default (io: ResyncSocketBackend): void => {
  io.on("connect", async client => {
    client.on("search", async (query, reply) => {
      log(`searching for ${query}`)

      return reply(await search(query))
    })
  })
}
