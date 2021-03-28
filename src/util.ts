export const ls = <T = any>(key: string, value?: T): T | null | undefined =>
  void 0 !== value
    ? localStorage.setItem(key, JSON.stringify(value))
    : JSON.parse(localStorage.getItem(key) as string)
