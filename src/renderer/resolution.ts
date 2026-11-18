const scales = [1, 0.86, 0.75, 0.64] as const

export function createFrameBudget() {
  let last: number | undefined
  let average: number | null = null
  let grade = 0
  let slow = 0
  let fast = 0

  function clearSamples() {
    last = undefined
    average = null
    slow = fast = 0
  }

  return {
    sample(now: number, adaptive: boolean) {
      const dt = last === undefined ? 0 : now - last
      last = now
      if (!adaptive || dt > 220 || dt < 0) {
        clearSamples()
        return false
      }
      if (dt < 3) return false
      average = average === null ? dt : average + (dt - average) * 0.08
      slow = average > 24 ? slow + dt : 0
      fast = average < 17.5 ? fast + dt : 0
      if (slow >= 1250 && grade < scales.length - 1) {
        grade++
        clearSamples()
        return true
      }
      if (fast >= 5500 && grade > 0) {
        grade--
        clearSamples()
        return true
      }
      return false
    },
    reset() { grade = 0; clearSamples() },
    get scale() { return scales[grade] },
    get average() { return average },
  }
}
