import type { VocaDatabase } from '../db'
import type { DaySessionSummary, UserProgressRecord } from '../types/progress'

interface LearningSnapshot {
  progress: UserProgressRecord[]
  daySessions: DaySessionSummary[]
}

async function csrf(): Promise<{ headerName: string; token: string }> {
  const response = await fetch('/api/csrf', { credentials: 'include' })
  if (!response.ok) throw new Error('CSRF token request failed')
  return response.json() as Promise<{ headerName: string; token: string }>
}

export async function uploadLearningData(database: VocaDatabase): Promise<void> {
  const snapshot = await database.transaction('r', database.progress, database.daySessions, async () => ({
    progress: await database.progress.toArray(),
    daySessions: await database.daySessions.toArray(),
  }))
  const token = await csrf()
  const response = await fetch('/api/sync', {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', [token.headerName]: token.token },
    body: JSON.stringify(snapshot),
  })
  if (!response.ok) throw new Error(`Sync upload failed: ${response.status}`)
}

export async function downloadLearningData(database: VocaDatabase): Promise<void> {
  const response = await fetch('/api/sync', { credentials: 'include', cache: 'no-store' })
  if (!response.ok) throw new Error(`Sync download failed: ${response.status}`)
  const snapshot = await response.json() as LearningSnapshot
  if (!Array.isArray(snapshot.progress) || !Array.isArray(snapshot.daySessions)) {
    throw new Error('Invalid sync response')
  }
  await database.transaction('rw', database.progress, database.daySessions, async () => {
    await database.progress.clear()
    await database.daySessions.clear()
    await database.progress.bulkPut(snapshot.progress)
    await database.daySessions.bulkPut(snapshot.daySessions)
  })
}
