import { useEffect } from 'react'
import { liveQuery } from 'dexie'
import type { VocaDatabase } from '../db'
import {
  readLearningSnapshot,
  synchronizeLearningData,
  uploadLearningData,
  type LearningSnapshot,
} from '../services/learningSync'

const AUTO_SAVE_DELAY_MS = 800

export function useLearningSync(database: VocaDatabase, userId?: number): void {
  useEffect(() => {
    if (userId === undefined) return undefined

    let stopped = false
    let ready = false
    let timer: ReturnType<typeof setTimeout> | undefined
    let running: Promise<void> | undefined
    let pending = false
    let latest: LearningSnapshot | undefined
    let saved: LearningSnapshot | undefined

    const changedSinceSaved = (): LearningSnapshot => {
      const savedProgress = new Map(saved?.progress.map((item) => [item.progressId, JSON.stringify(item)]))
      const savedSessions = new Map(saved?.daySessions.map((item) => [item.contentId, JSON.stringify(item)]))
      return {
        progress: latest?.progress.filter((item) => savedProgress.get(item.progressId) !== JSON.stringify(item)) ?? [],
        daySessions: latest?.daySessions.filter((item) => savedSessions.get(item.contentId) !== JSON.stringify(item)) ?? [],
      }
    }

    const save = (): void => {
      if (stopped || !ready) return
      const changes = changedSinceSaved()
      if (changes.progress.length === 0 && changes.daySessions.length === 0) return
      if (running !== undefined) {
        pending = true
        return
      }
      pending = false
      running = uploadLearningData(database, changes)
        .then(() => { saved = mergeSnapshots(saved, changes) })
        .catch(() => undefined)
        .finally(() => {
          running = undefined
          if (pending) save()
        })
    }
    const schedule = (): void => {
      if (stopped) return
      if (!ready) {
        pending = true
        return
      }
      if (timer !== undefined) clearTimeout(timer)
      timer = setTimeout(save, AUTO_SAVE_DELAY_MS)
    }

    const subscription = liveQuery(() => readLearningSnapshot(database)).subscribe({
      next: (snapshot) => {
        latest = snapshot
        schedule()
      },
      error: () => undefined,
    })

    void synchronizeLearningData(database)
      .then(async () => {
        saved = await readLearningSnapshot(database)
        latest = saved
        ready = true
        if (pending) save()
      })
      .catch(() => {
        ready = true
        if (pending) save()
      })

    const retry = (): void => save()
    window.addEventListener('online', retry)
    document.addEventListener('visibilitychange', retry)

    return () => {
      stopped = true
      subscription.unsubscribe()
      if (timer !== undefined) clearTimeout(timer)
      window.removeEventListener('online', retry)
      document.removeEventListener('visibilitychange', retry)
    }
  }, [database, userId])
}

function mergeSnapshots(base: LearningSnapshot | undefined, changes: LearningSnapshot): LearningSnapshot {
  const progress = new Map(base?.progress.map((item) => [item.progressId, item]))
  const daySessions = new Map(base?.daySessions.map((item) => [item.contentId, item]))
  changes.progress.forEach((item) => progress.set(item.progressId, item))
  changes.daySessions.forEach((item) => daySessions.set(item.contentId, item))
  return { progress: [...progress.values()], daySessions: [...daySessions.values()] }
}
