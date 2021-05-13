import { getVideoID } from "ytdl-core"
import type { MediaSourceAny } from "../types/mediaSource"
import { getCombinedStream, getTitle, getUploader } from "./youtube"

export const resolveContent = async (
  url: string,
  startFrom: number
): Promise<MediaSourceAny> => {
  if (url.match(/youtube\.com|youtu\.be/)) {
    return {
      startFrom,
      platform: "youtube",
      video: await getCombinedStream(url),
      title: await getTitle(url),
      uploader: await getUploader(url),
      thumb: `https://i.ytimg.com/vi/${getVideoID(url)}/mqdefault.jpg`,
      type: "video",
      originalSource: { url, youtubeID: getVideoID(url) },
    }
  }

  return {
    startFrom,
    platform: "other",
    video: [{ quality: "default", url }],
    title: `content from ${new URL(url).hostname}`,
    type: "video",
    originalSource: { url },
  }
}
