import type { ResyncSocketBackend } from "$/room"

import ytsr from "ytsr"

import debug from "debug"
const log = debug("resync:search")

const opt: ytsr.Options = {
  limit: 10,
}

export default (io: ResyncSocketBackend): void => {
  io.on("connect", async client => {
    client.on("search", async (query, reply) => {
      log(`searching for ${query}`)

      const filters = await ytsr.getFilters(query)
      const videos = filters.get("Type")?.get("Video")

      if (!videos?.url) throw Error("video filter is falsy")

      const res = await ytsr(videos.url, opt)
      return reply(res.items)
    })
  })
}
