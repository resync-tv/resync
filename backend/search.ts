import type { ResyncSocketBackend } from "$/socket"
import type { MediaSourceAny } from "$/mediaSource"

import ytsr from "ytsr"

import debug from "debug"
import { timestampToDuration } from "./util"
const log = debug("resync:search")

const opt: ytsr.Options = {
  limit: 10,
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
    thumb: video.bestThumbnail.url ?? undefined,
    uploader: video.author?.name ?? undefined,
  }
}

export default (io: ResyncSocketBackend): void => {
  io.on("connect", async client => {
    client.on("search", async (query, reply) => {
      log(`searching for ${query}`)

      const filters = await ytsr.getFilters(query)
      const videos = filters.get("Type")?.get("Video")

      if (!videos?.url) throw Error("video filter is falsy")

      const res = await ytsr(videos.url, opt)
      return reply(res.items.map(transform))
    })
  })
}
