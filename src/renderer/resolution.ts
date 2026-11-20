const scales = [1, 0.86, 0.75, 0.64] as const

export function createFrameBudget() {
  let last: number | undefined
  let average: number | null = null
  let cpuAverage: number | null = null
  let grade = 0
  let slow = 0
  let fast = 0

  function clearSamples() {
    last = undefined
    average = null
    cpuAverage = null
    slow = fast = 0
  }

  return {
    sample(now: number, adaptive: boolean, renderCpuMs?: number) {
      const dt = last === undefined ? 0 : now - last
      last = now
      if (!adaptive || dt > 220 || dt < 0) {
        clearSamples()
        return false
      }
      if (dt < 3) return false
      average = average === null ? dt : average + (dt - average) * 0.08
      if (renderCpuMs !== undefined && Number.isFinite(renderCpuMs)) {
        cpuAverage = cpuAverage === null ? renderCpuMs : cpuAverage + (renderCpuMs - cpuAverage) * 0.12
      }
      // If render CPU time is explicitly low (< 6 ms) on a steady 30 Hz display (dt ~33 ms), do not degrade scale.
      const overloaded = cpuAverage !== null
        ? (cpuAverage > 11 || (average > 24 && cpuAverage > 6.5))
        : average > 24
      const comfortable = cpuAverage !== null
        ? (cpuAverage < 6.5 || average < 17.5)
        : average < 17.5

      slow = overloaded ? slow + dt : 0
      fast = comfortable && !overloaded ? fast + dt : 0
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
    get cpuAverage() { return cpuAverage },
  }
}
