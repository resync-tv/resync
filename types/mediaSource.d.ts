export type Platform = "youtube" | "soundcloud" | "other"

export interface MediaSource {
  url: string
  quality: string
}

export type MediaType = "audio" | "video" | "audiovideo"

export interface MediaBase {
  platform: Platform
  startFrom: number
  title: string
  thumb?: string
  type: MediaType
}

export interface MediaAudio extends MediaBase {
  audio: MediaSource[]
  type: "audio"
}

export interface MediaVideo extends MediaBase {
  video: MediaSource[]
  type: "video"
}

export interface MediaAudioVideo extends MediaAudio, MediaVideo {
  type: "audiovideo"
}

export type MediaSourceAny = MediaAudio | MediaVideo | MediaAudioVideo
