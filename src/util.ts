import _debug from "debug"

interface LocalStored {
  "resync-username": string
  "resync-volume": number
  "resync-muted": boolean
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

export const capitalize = (str: string): string => [...str][0].toUpperCase() + str.slice(1)
export const once = <A extends any[], R, T>(
  fn: (this: T, ...arg: A) => R
): ((this: T, ...arg: A) => R | undefined) => {
  let done = false
  return function (this: T, ...args: A) {
    return done ? void 0 : ((done = true), fn.apply(this, args))
  }
}

export const debug = (namespace: string): _debug.Debugger => _debug("resync").extend(namespace)

export const minMax = (n: number, min = 0, max = 1): number => Math.max(min, Math.min(max, n))
