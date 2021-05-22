export const average = (...n: number[]): number => n.reduce((a, v) => a + v, 0) / n.length

export const timestampToDuration = (timestamp: string): number => {
  const ordered = timestamp.split(":").reverse()
  if (!ordered.length) throw Error(`${timestamp} is not a valid timestamp`)

  let res = parseInt(ordered[0])
  if (ordered[1]) res += parseInt(ordered[1]) * 60
  if (ordered[2]) res += parseInt(ordered[2]) * 60 * 60

  return res
}
