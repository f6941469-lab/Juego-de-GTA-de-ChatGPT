export interface Location {
  x: number
  z: number
}

export type SearchState = 'Patrullaje' | 'Investigación' | 'Persecución' | 'Búsqueda'

export const responseLevels = [
  { units: 1, detection: 0, patience: 0 },
  { units: 1, detection: 35, patience: 11 },
  { units: 2, detection: 39, patience: 14 },
  { units: 3, detection: 44, patience: 17 },
  { units: 4, detection: 48, patience: 20 },
  { units: 5, detection: 53, patience: 23 },
] as const

export function createWantedSystem() {
  let level = 0
  let time = 0
  let lastContact = -Infinity
  let lastIncident = -Infinity
  let hasSight = false
  let lastKnown: Location | undefined
  let predicted: Location | undefined

  function report(position: Location, severity = 1, force?: number) {
    if (force === undefined && time - lastIncident < 2.75) return
    level = Math.max(0, Math.min(5, force ?? level + severity))
    lastIncident = time
    lastContact = time
    hasSight = false
    lastKnown = level ? { ...position } : undefined
    predicted = lastKnown
  }

  function step(dt: number, observed?: Location) {
    time += dt
    if (!level) return
    if (observed) {
      const interval = time - lastContact
      if (hasSight && lastKnown && interval > 0) {
        const scale = Math.min(3 / interval, 1 / Math.max(0.01, Math.hypot(observed.x - lastKnown.x, observed.z - lastKnown.z)) * 22)
        predicted = {
          x: observed.x + (observed.x - lastKnown.x) * scale,
          z: observed.z + (observed.z - lastKnown.z) * scale,
        }
      } else {
        predicted = { ...observed }
      }
      hasSight = true
      lastKnown = { ...observed }
      lastContact = time
    } else if (time - lastContact >= responseLevels[level].patience) {
      level--
      lastContact = time
      hasSight = false
      if (!level) lastKnown = predicted = undefined
    }
  }

  function state(): SearchState {
    if (!level) return 'Patrullaje'
    if (hasSight && time - lastContact < 1.8) return 'Persecución'
    if (!hasSight && time - lastIncident < 4) return 'Investigación'
    return 'Búsqueda'
  }

  return {
    report,
    step,
    get level() { return level },
    get lastKnown() { return lastKnown },
    get predicted() { return predicted },
    get state() { return state() },
    reset() { report({ x: 0, z: 0 }, 0, 0); lastIncident = -Infinity },
  }
}
