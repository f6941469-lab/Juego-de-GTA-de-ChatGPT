import type { Quality } from '../config/game'

export interface AudioPreference {
  volume: number
  muted: boolean
}

function openPreferences(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('viceblock', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('preferences')
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close()
      resolve(request.result)
    }
    request.onerror = () => reject(request.error)
  })
}

async function load(key: string): Promise<unknown> {
  try {
    const db = await openPreferences()
    try {
      return await new Promise((resolve, reject) => {
        const request = db.transaction('preferences').objectStore('preferences').get(key)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
    } finally {
      db.close()
    }
  } catch {
    return undefined
  }
}

async function save(key: string, value: unknown): Promise<void> {
  try {
    const db = await openPreferences()
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction('preferences', 'readwrite')
        transaction.oncomplete = () => resolve()
        transaction.onabort = () => reject(transaction.error)
        transaction.objectStore('preferences').put(value, key)
      })
    } finally {
      db.close()
    }
  } catch {
    // Unavailable storage does not change the in-memory settings.
  }
}

export async function loadQuality(): Promise<Quality | undefined> {
  const value = await load('quality')
  return value === 'low' || value === 'medium' || value === 'high' || value === 'ultra' ? value : undefined
}

export const saveQuality = (quality: Quality) => save('quality', quality)

export async function loadAudioPreference(): Promise<AudioPreference | undefined> {
  const value = await load('audio')
  if (value && typeof value === 'object' && 'volume' in value && 'muted' in value
    && typeof value.volume === 'number' && Number.isFinite(value.volume) && typeof value.muted === 'boolean') {
    return { volume: Math.min(1, Math.max(0, value.volume)), muted: value.muted }
  }
}

export const saveAudioPreference = (audio: AudioPreference) => save('audio', audio)
