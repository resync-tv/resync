import { Segment } from "sponsorblock-api"

export type Platform = "youtube" | "soundcloud" | "other"

export interface MediaRawSource {
  url: string
  quality: string
}

export interface OriginalSource {
  url: string
  youtubeID?: string
}

export type MediaType = "audio" | "video" | "audiovideo"

export interface MediaBase {
  platform: Platform
  startFrom: number
  title: string
  uploader?: string
  thumb?: string
  segments?: Segment[]
  duration: number
  type: MediaType
  originalSource: OriginalSource
}

export interface MediaAudio extends MediaBase {
  audio: MediaRawSource[]
  type: "audio"
}

export interface MediaVideo extends MediaBase {
  video: MediaRawSource[]
  type: "video"
}

export interface MediaAudioVideo extends MediaAudio, MediaVideo {
  type: "audiovideo"
}

// prettier-ignore
export interface MediaSourceAny extends MediaBase, Partial<MediaAudio>, Partial<MediaVideo>, Partial<MediaAudioVideo> {}
