import type { VocaDatabase } from '../db'
import type { DaySessionSummary, UserProgressRecord } from '../types/progress'

export interface LearningSnapshot {
  progress: UserProgressRecord[]
  daySessions: DaySessionSummary[]
}

export class LearningSyncError extends Error {
  readonly status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'LearningSyncError'
    this.status = status
  }
}

export async function readLearningSnapshot(database: VocaDatabase): Promise<LearningSnapshot> {
  return database.transaction('r', database.progress, database.daySessions, async () => ({
    progress: await database.progress.toArray(),
    daySessions: await database.daySessions.toArray(),
  }))
}

async function csrf(): Promise<{ headerName: string; token: string }> {
  const response = await fetch('/api/csrf', { credentials: 'include' })
  if (!response.ok) throw new LearningSyncError('CSRF token request failed', response.status)
  return response.json() as Promise<{ headerName: string; token: string }>
}

export async function uploadLearningData(
  database: VocaDatabase,
  snapshot?: LearningSnapshot,
): Promise<void> {
  const body = snapshot ?? await readLearningSnapshot(database)
  const token = await csrf()
  const response = await fetch('/api/sync', {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', [token.headerName]: token.token },
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new LearningSyncError(`Sync upload failed: ${response.status}`, response.status)
}

export async function downloadLearningData(database: VocaDatabase): Promise<void> {
  const response = await fetch('/api/sync', { credentials: 'include', cache: 'no-store' })
  if (!response.ok) throw new LearningSyncError(`Sync download failed: ${response.status}`, response.status)
  const snapshot = await response.json() as LearningSnapshot
  if (!Array.isArray(snapshot.progress) || !Array.isArray(snapshot.daySessions)) {
    throw new Error('Invalid sync response')
  }
  await mergeSnapshotIntoLocal(database, snapshot)
}

export async function synchronizeLearningData(database: VocaDatabase): Promise<void> {
  await downloadLearningData(database)
  await uploadLearningData(database)
}

async function mergeSnapshotIntoLocal(database: VocaDatabase, remote: LearningSnapshot): Promise<void> {
  await database.transaction('rw', database.progress, database.daySessions, async () => {
    for (const incoming of remote.progress) {
      const current = await database.progress.get(incoming.progressId)
      if (current === undefined) {
        await database.progress.put(incoming)
        continue
      }
      const newest = incoming.lastStudiedAt > current.lastStudiedAt ? incoming : current
      await database.progress.put({
        ...newest,
        isFavorite: newest.isFavorite ?? false,
        correctCountKoToEn: Math.max(current.correctCountKoToEn, incoming.correctCountKoToEn),
        incorrectCountKoToEn: Math.max(current.incorrectCountKoToEn, incoming.incorrectCountKoToEn),
        correctCountEnToKo: Math.max(current.correctCountEnToKo, incoming.correctCountEnToKo),
        incorrectCountEnToKo: Math.max(current.incorrectCountEnToKo, incoming.incorrectCountEnToKo),
      })
    }
    for (const incoming of remote.daySessions) {
      const current = await database.daySessions.get(incoming.contentId)
      if (current === undefined) {
        await database.daySessions.put(incoming)
        continue
      }
      await database.daySessions.put({
        contentId: incoming.contentId,
        completedStudy: current.completedStudy || incoming.completedStudy,
        koToEnHighScore: Math.max(current.koToEnHighScore, incoming.koToEnHighScore),
        enToKoHighScore: Math.max(current.enToKoHighScore, incoming.enToKoHighScore),
        lastAttemptAtKoToEn: latest(current.lastAttemptAtKoToEn, incoming.lastAttemptAtKoToEn),
        lastAttemptAtEnToKo: latest(current.lastAttemptAtEnToKo, incoming.lastAttemptAtEnToKo),
      })
    }
  })
}

function latest(first?: string, second?: string): string | undefined {
  if (first === undefined) return second
  if (second === undefined) return first
  return first > second ? first : second
}
