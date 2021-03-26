import { createApp } from "vue"
import App from "@/App.vue"
import router from "./router"
import "virtual:windi.css"
import "./assets/material-icons.css"

import type { MediaMetadata, MediaSession } from "$/MediaSession"

declare global {
  interface Navigator {
    mediaSession?: MediaSession
  }
  interface Window {
    MediaMetadata?: MediaMetadata
  }
}

createApp(App).use(router).mount("#app")
