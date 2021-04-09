import * as Sentry from "@sentry/node"

import debug from "debug"
const log = debug("resync:sentry")

Sentry.init({
  dsn: "https://5b4d331966544c5e823e1ea81f56e3cf@o105856.ingest.sentry.io/5712866",
  tracesSampleRate: 1.0,
})

log("initialized sentry.io")
