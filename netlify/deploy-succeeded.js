/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
const got = require("got")

const token = process.env.TELEGRAM_TOKEN
const chat_id = process.env.TELEGRAM_TO
const telegram = m => `https://api.telegram.org/bot${token}/${m}`

const formatDuration = ms => {
  if (ms < 0) ms = -ms
  const time = {
    d: Math.floor(ms / 86400000),
    h: Math.floor(ms / 3600000) % 24,
    m: Math.floor(ms / 60000) % 60,
    s: Math.floor(ms / 1000) % 60,
    ms: Math.floor(ms) % 1000,
  }
  return Object.entries(time)
    .filter(val => val[1] !== 0)
    .map(([key, val]) => `${val}${key}`)
    .join(", ")
}

const deployMessage = payload => {
  const {
    deploy_time,
    links: { permalink },
  } = payload

  return (
    `🔄 successfully published <a href="${permalink}">new version</a> ` +
    `in ${formatDuration(deploy_time * 1e3)}.`
  )
}

const send = async text => {
  const url = new URL(telegram("sendMessage"))

  const searchParams = {
    text,
    chat_id,
    disable_web_page_preview: true,
    parse_mode: "HTML",
    disable_notification: true,
  }

  Object.entries(searchParams).forEach(p => {
    url.searchParams.set(...p)
  })

  await got(url.toString(), { method: "POST" })
}

const handler = async event => {
  const { payload } = JSON.parse(event.body)
  console.log(token, chat_id, deployMessage(payload))

  await send(deployMessage(payload))

  return { statusCode: 200 }
}

exports.formatDuration = formatDuration
exports.deployMessage = deployMessage
exports.send = send
exports.handler = handler
