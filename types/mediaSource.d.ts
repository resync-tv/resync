export type Platform = "youtube" | "soundcloud" | "other"

export interface MediaSource {
  url: string
  quality: string
}

export interface MediaBase {
  platform: Platform
  startFrom: number
  title: string
  thumb?: string
}

export interface MediaAudio extends MediaBase {
  audio: MediaSource[]
}

export interface MediaVideo extends MediaBase {
  video: MediaSource[]
}

export interface MediaAudioVideo extends MediaAudio, MediaVideo {}

export type MediaSourceAny = MediaAudio | MediaVideo | MediaAudioVideo
