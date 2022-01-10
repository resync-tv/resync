const timestampRegex = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/
const onlyNumbers = /^\d+$/

export const getTimestamp = (url: string): number => {
  const timestamp = new URL(url).searchParams.get("t")

  if (!timestamp) return 0
  if (onlyNumbers.test(timestamp)) return parseInt(timestamp)

  let startFrom = 0

  const match = timestampRegex.exec(timestamp)
  if (match) {
    const [, hours, minutes, seconds] = match
    if (hours) startFrom += parseInt(hours) * 60 * 60
    if (minutes) startFrom += parseInt(minutes) * 60
    if (seconds) startFrom += parseInt(seconds)
  }
  return startFrom
}
