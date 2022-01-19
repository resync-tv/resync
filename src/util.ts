import _debug from "debug"
import type { SegmentColorSettings } from "./sponsorblock"

interface LocalStored {
  "resync-displayname": string
  "resync-volume": number
  "resync-muted": boolean
  "resync-last-room": string
  "segment-colors": SegmentColorSettings
}

const urlReg =
  //? researching this can lead to very deep rabbit holes, but i think i'd consider this good enough.
  /(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\\+.~#?&//=]*)/i

export const isURL = (str: string): boolean => urlReg.test(str)

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

export const validateName = (name: string): string => {
  name = name.trim()

  if (!name) throw "please enter a name"
  if (!/[a-z0-9\u00F0-\u02AF]/i.test(name)) throw "name must be alphanumeric"
  if (name.length < 3) throw "name must be 3 or more characters"
  if (name.length > 16) throw "name must be less than 16 characters"

  return name
}

export const bufferedStub: any = []
bufferedStub.start = () => 0
bufferedStub.end = () => 0

export const bufferedArray = (
  buffered: HTMLMediaElement["buffered"],
  duration: number
): number[][] => {
  const ret = []

  for (let i = 0; i < buffered.length; i++) {
    const start = buffered.start(i) / duration
    const end = buffered.end(i) / duration

    ret.push([start, end])
  }

  return ret
}

export const isStaging = () => location.hostname === "staging.resync.tv"

export const unfocus = (): void => (window.document.activeElement as HTMLElement)?.blur?.()

// TODO: consider removing
export const touchEventOffset = (event: any, target?: any) : [number, number] => {
  target = target || event.currentTarget

  const cx = event.clientX || 0
  const cy = event.clientY || 0
  const rect = target.getBoundingClientRect()

  return [(cx - rect.left)/(rect.right - rect.left), (cy - rect.top)/(rect.bottom - rect.top)]
}
