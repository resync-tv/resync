import * as sentry from "@sentry/browser"
import { Integrations } from "@sentry/tracing"

if (process.env.NODE_ENV !== "development") {
  sentry.init({
    dsn: "https://5b4d331966544c5e823e1ea81f56e3cf@o105856.ingest.sentry.io/5712866",
    integrations: [new Integrations.BrowserTracing()],
    tracesSampleRate: 1.0,
  })
}

import { createApp } from "vue"
import App from "@/App.vue"
import router from "./router"
import "virtual:windi.css"
import "vite-plugin-svg-icons/register"

import "@/assets/theme.css"
import "@/assets/RobotoMonoTimestamp.css"

import type { MediaMetadata, MediaSession } from "$/MediaSession"

declare global {
  interface Navigator {
    mediaSession?: MediaSession
  }
  interface Window {
    MediaMetadata?: MediaMetadata
  }
}

const app = createApp(App)
app.use(router).mount("#app")

app.config.errorHandler = (error, _, info) => {
  sentry.setTag("info", info)
  sentry.captureException(error)
}
