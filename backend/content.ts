import { getVideoID } from "ytdl-core"
import type { MediaSourceAny } from "../types/mediaSource"
import { getCombinedStream, getInfo } from "./youtube"

export const resolveContent = async (
  url: string,
  startFrom: number
): Promise<MediaSourceAny> => {
  if (url.match(/youtube\.com|youtu\.be/)) {
    const video = await getCombinedStream(url)
    const { title, author, lengthSeconds } = await getInfo(url)

    return {
      platform: "youtube",
      startFrom,
      video,
      title,
      duration: parseInt(lengthSeconds),
      uploader: author.name,
      thumb: `https://i.ytimg.com/vi/${getVideoID(url)}/mqdefault.jpg`,
      type: "video",
      originalSource: { url, youtubeID: getVideoID(url) },
    }
  }

  return {
    startFrom,
    // TODO
    duration: 0,
    platform: "other",
    video: [{ quality: "default", url }],
    title: `content from ${new URL(url).hostname}`,
    type: "video",
    originalSource: { url },
  }
}
