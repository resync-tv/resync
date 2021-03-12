export type Platform = "youtube" | "soundcloud" | "other"

export interface MediaSource {
  url: string
  quality: string
}

export interface MediaBase {
  platform: Platform
  startFrom: number
}

export interface MediaAudio extends MediaBase {
  audio: MediaSource[]
}

export interface MediaVideo extends MediaBase {
  video: MediaSource[]
}

export interface MediaAudioVideo extends MediaAudio, MediaVideo {}
