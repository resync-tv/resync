import { getVideoID } from "ytdl-core"
import type { MediaSourceAny } from "../types/mediaSource"
import { getCombinedStream, getTitle } from "./youtube"

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
      thumb: `https://i.ytimg.com/vi/${getVideoID(url)}/mqdefault.jpg`,
    }
  }

  return {
    startFrom,
    platform: "other",
    video: [{ quality: "default", url }],
    title: `content from ${new URL(url).hostname}`,
  }
}
