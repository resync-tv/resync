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

export const defaultBlockedCategories: Record<Category, boolean> = {
  sponsor: true,
  intro: true,
  outro: true,
  interaction: true,
  selfpromo: true,
  music_offtopic: true,
  preview: true,
}
