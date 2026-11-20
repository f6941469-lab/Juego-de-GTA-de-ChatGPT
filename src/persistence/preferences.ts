import type { Quality } from '../config/game'

function openPreferences(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('viceblock', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('preferences')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    request.onblocked = () => reject(new Error('IndexedDB is waiting for another tab'))
  })
}

export async function loadQuality(): Promise<Quality | undefined> {
  try {
    const db = await openPreferences()
    try {
      return await new Promise((resolve, reject) => {
        const request = db.transaction('preferences').objectStore('preferences').get('quality')
        request.onsuccess = () => {
          const value: unknown = request.result
          resolve(value === 'low' || value === 'medium' || value === 'high' || value === 'ultra' ? value : undefined)
        }
        request.onerror = () => reject(request.error)
      })
    } finally {
      db.close()
    }
  } catch {
    // Private browsing or a restricted embed may make storage unavailable.
    return undefined
  }
}

export async function saveQuality(quality: Quality): Promise<void> {
  try {
    const db = await openPreferences()
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction('preferences', 'readwrite')
        transaction.oncomplete = () => resolve()
        transaction.onabort = () => reject(transaction.error)
        transaction.objectStore('preferences').put(quality, 'quality')
      })
    } finally {
      db.close()
    }
  } catch {
    // The in-memory preference still works for this session.
  }
}
