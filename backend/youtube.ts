import type { Server } from "socket.io"

import ytdl, { videoFormat } from "ytdl-core"
import { promisify, dev } from "./util"

const getCombinedStreamRaw = async (id: string) => {
  dev.log(`fetching fresh combined stream for ${id}`)

  const { formats } = await ytdl.getInfo(id)

  const combined = formats.filter(f => f.hasAudio && f.hasVideo)
  const [best] = combined.sort((a, b) => (b.height || 0) - (a.height || 0))

  return best
}

interface VideoFormatWithExpiration extends videoFormat {
  expires: Date
}

const combinedCached: Record<string, VideoFormatWithExpiration> = {}

const getCombinedStream = async (source: string) => {
  const id = ytdl.getVideoID(source)

  dev.log(`getting combined stream for ${id}`)

  if (combinedCached[id]) {
    dev.log(`combined stream in cache for ${id}`)
    if (combinedCached[id].expires < new Date()) delete combinedCached[id]
    else return combinedCached[id]
  }

  const best = await getCombinedStreamRaw(id)
  const url = new URL(best.url)
  const expires = Number(url.searchParams.get("expire"))

  combinedCached[id] = {
    ...best,
    expires: new Date(expires * 1e3),
  }

  return combinedCached[id]
}

const include = [getCombinedStream]

export default (io: Server): void => {
  io.on("connect", client => include.map(fn => client.on(fn.name, promisify(fn))))
}
