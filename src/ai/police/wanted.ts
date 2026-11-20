export interface Location {
  x: number
  z: number
}

export type SearchState = 'Patrullaje' | 'Investigación' | 'Persecución' | 'Búsqueda'

export type IncidentKind =
  | 'crime_report'
  | 'witness'
  | 'gunshot'
  | 'robbery'
  | 'accident'
  | 'vandalism'
  | 'patrol_sight'

export interface SuspectDescription {
  inVehicle: boolean
  vehicleId?: string
  vehicleLabel?: string
  armed: boolean
  recordedAt: number
}

export interface ReportMetadata {
  suspect?: Partial<Omit<SuspectDescription, 'recordedAt'>>
  kind?: IncidentKind
  storeSiege?: boolean
}

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
  let suspectDescription: SuspectDescription | undefined
  let activeIncident: IncidentKind = 'crime_report'
  let storeSiege = false

  function updateDescription(partial?: Partial<Omit<SuspectDescription, 'recordedAt'>>) {
    if (!partial) return
    suspectDescription = {
      inVehicle: partial.inVehicle ?? suspectDescription?.inVehicle ?? false,
      vehicleId: partial.inVehicle === false ? undefined : (partial.vehicleId ?? suspectDescription?.vehicleId),
      vehicleLabel: partial.inVehicle === false ? undefined : (partial.vehicleLabel ?? suspectDescription?.vehicleLabel),
      armed: partial.armed ?? suspectDescription?.armed ?? false,
      recordedAt: time,
    }
  }

  function report(position: Location, severity = 1, force?: number, meta?: ReportMetadata) {
    if (force === undefined && time - lastIncident < 2.75) {
      if (meta?.suspect && level > 0) updateDescription(meta.suspect)
      if (meta?.storeSiege) storeSiege = true
      return
    }
    level = Math.max(0, Math.min(5, force ?? level + severity))
    lastIncident = time
    lastContact = time
    hasSight = false
    if (level === 0) {
      lastKnown = undefined
      predicted = undefined
      suspectDescription = undefined
      storeSiege = false
      activeIncident = 'crime_report'
      return
    }
    lastKnown = { ...position }
    predicted = lastKnown
    activeIncident = meta?.kind ?? (meta?.storeSiege ? 'robbery' : 'crime_report')
    if (meta?.storeSiege !== undefined) storeSiege = meta.storeSiege
    if (meta?.suspect) updateDescription(meta.suspect)
  }

  function step(dt: number, observed?: Location, meta?: { suspect?: Partial<Omit<SuspectDescription, 'recordedAt'>> }) {
    time += dt
    if (!level) return
    if (observed) {
      const interval = time - lastContact
      if (hasSight && lastKnown && interval > 0) {
        const scale = Math.min(
          3 / interval,
          1 / Math.max(0.01, Math.hypot(observed.x - lastKnown.x, observed.z - lastKnown.z)) * 22,
        )
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
      if (meta?.suspect) updateDescription(meta.suspect)
    } else if (time - lastContact >= responseLevels[level].patience) {
      level--
      lastContact = time
      hasSight = false
      storeSiege = false
      if (!level) {
        lastKnown = undefined
        predicted = undefined
        suspectDescription = undefined
        activeIncident = 'crime_report'
      }
    }
  }

  function matchesSuspect(candidate?: { inVehicle?: boolean; vehicleId?: string; armed?: boolean }): boolean {
    if (!candidate || !suspectDescription) return true
    if (candidate.inVehicle === undefined && candidate.armed === undefined && !candidate.vehicleId) return true
    if (candidate.inVehicle) {
      if (!suspectDescription.inVehicle) return false
      if (suspectDescription.vehicleId && candidate.vehicleId && suspectDescription.vehicleId !== candidate.vehicleId) {
        return false
      }
      return true
    }
    // Suspect on foot while police are looking for a known car: concealed unless overtly armed in close sight
    if (suspectDescription.inVehicle && !candidate.armed) return false
    return true
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
    matchesSuspect,
    get level() { return level },
    get hasSight() { return hasSight },
    get lastKnown() { return lastKnown },
    get predicted() { return predicted },
    get suspectDescription() { return suspectDescription },
    get activeIncident() { return activeIncident },
    get storeSiege() { return storeSiege },
    get state() { return state() },
    reset() {
      report({ x: 0, z: 0 }, 0, 0)
      lastIncident = -Infinity
    },
  }
}
