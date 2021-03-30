interface LocalStored {
  "resync-username": string
  "resync-volume": number
}

export const ls = <L extends keyof LocalStored>(
  key: L,
  value?: LocalStored[L]
): LocalStored[L] | null =>
  void 0 !== value
    ? localStorage.setItem(key, JSON.stringify(value))
    : JSON.parse(localStorage.getItem(key) as string)

export const timestamp = (seconds = 0): string => {
  const pad = (n: number) => n.toString().padStart(2, "0")

  if (isNaN(seconds)) seconds = 0

  const h = Math.floor(seconds / 3600)
  const m = Math.floor(seconds / 60) % 60
  const s = Math.floor(seconds - m * 60) % 3600

  const ts = `${pad(s)}`

  if (h) return `${h}:${pad(m)}:${ts}`
  else return `${m}:${ts}`
}
