type GenericFunction = (...x: any[]) => any
export const promisify = (fn: GenericFunction) => {
  return async (...arg: any[]): Promise<void> => {
    const last = arg.length - 1
    arg[last](await fn(...arg.slice(0, last)))
  }
}

export const dev = {
  log: (...t: any[]): void =>
    process.env.NODE_ENV === "development" ? console.log(...t) : undefined,
}

export const average = (...n: number[]): number => n.reduce((a, v) => a + v, 0) / n.length
