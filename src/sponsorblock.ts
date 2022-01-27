import { Category } from "sponsorblock-api"

export const allCategories: Array<Category> = [
  "sponsor",
  "intro",
  "outro",
  "interaction",
  "selfpromo",
  "music_offtopic",
  "preview",
]

export type SegmentColorSettings = Partial<Record<Category, string>>

export const defaultSegmentColors: SegmentColorSettings = {
  interaction: "#00ffcc",
  intro: "#0011ff",
  music_offtopic: "#fbff00",
  outro: "#2b00ff",
  preview: "#04ff00",
  selfpromo: "#ff00bb",
  sponsor: "#ff0000",
}
