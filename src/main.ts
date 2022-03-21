import * as sentry from "@sentry/browser"
import { Integrations } from "@sentry/tracing"

if (process.env.NODE_ENV !== "development") {
  sentry.init({
    dsn: "https://5b4d331966544c5e823e1ea81f56e3cf@o105856.ingest.sentry.io/5712866",
    integrations: [new Integrations.BrowserTracing()],
    tracesSampleRate: 1.0,
  })
}

const log = debug("main")

import type { MediaMetadata } from "/$/MediaSession"

import { createApp } from "vue"
import App from "/@/App.vue"
import router from "./router"

import "/@/assets/theme.css"
import "/@/assets/fonts/fonts.css"

import "virtual:windi.css"
import "virtual:svg-icons-register"

import { registerSW } from "virtual:pwa-register"
import { debug } from "./util"
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const updateSW = registerSW({
  onOfflineReady: () => log("offline ready"),
})

declare global {
  //? seems to be in typescript itself now
  // interface Navigator {
  //   mediaSession?: MediaSession
  // }
  interface Window {
    MediaMetadata?: typeof MediaMetadata
  }
}

const app = createApp(App)
app.use(router).mount("#app")

app.config.errorHandler = (error, _, info) => {
  sentry.setTag("info", info)
  sentry.captureException(error)
}
