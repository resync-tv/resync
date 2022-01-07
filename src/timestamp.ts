export function getTimestamp(url: string) : number {
    let startFrom = 0
    const timestamp = (new URL(url)).searchParams.get('t')
    if (timestamp) {
      const match = /((\d*?)m(\d*?)s)|(\d*)/g.exec(timestamp)
      if (match && match[2] && match[3]) {
        startFrom = parseInt(match[2])*60 + parseInt(match[3])
      } else if (match && match[4]) {
        startFrom =  parseInt(match[4])
      }
    }
    return startFrom
}