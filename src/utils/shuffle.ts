export function shuffledCopy<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const shuffled = [...items]
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const targetIndex = Math.floor(random() * (index + 1))
    ;[shuffled[index], shuffled[targetIndex]] = [shuffled[targetIndex]!, shuffled[index]!]
  }
  return shuffled
}
