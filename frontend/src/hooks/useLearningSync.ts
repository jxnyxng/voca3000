import { useCallback, useEffect, useState } from 'react'
import { liveQuery } from 'dexie'
import type { VocaDatabase } from '../db'
import {
  readLearningSnapshot,
  LearningSyncError,
  synchronizeLearningData,
  uploadLearningData,
  type LearningSnapshot,
} from '../services/learningSync'

const AUTO_SAVE_DELAY_MS = 800
const RETRY_DELAYS_MS = [5_000, 15_000, 30_000, 60_000] as const
const FAILURE_NOTICE_THRESHOLD = 3

export type LearningSyncIssue = 'auth-required' | 'offline' | 'unavailable'

export interface LearningSyncStatus {
  issue: LearningSyncIssue | null
  retry: () => void
}

export function useLearningSync(database: VocaDatabase, userId?: number): LearningSyncStatus {
  const [issueState, setIssueState] = useState<{ userId: number; issue: LearningSyncIssue } | null>(null)
  const [retryGeneration, setRetryGeneration] = useState(0)
  const retry = useCallback(() => setRetryGeneration((value) => value + 1), [])

  useEffect(() => {
    if (userId === undefined) {
      return undefined
    }
    const currentUserId = userId

    let stopped = false
    let ready = false
    let initializing = true
    let timer: ReturnType<typeof setTimeout> | undefined
    let retryTimer: ReturnType<typeof setTimeout> | undefined
    let running: Promise<void> | undefined
    let pending = false
    let failureCount = 0
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

    const clearRetryTimer = (): void => {
      if (retryTimer !== undefined) clearTimeout(retryTimer)
      retryTimer = undefined
    }
    const succeeded = (): void => {
      failureCount = 0
      clearRetryTimer()
      if (!stopped) setIssueState(null)
    }
    const failed = (error: unknown): void => {
      failureCount += 1
      const status = error instanceof LearningSyncError ? error.status : undefined
      if (!stopped && (status === 401 || status === 403)) {
        setIssueState({ userId: currentUserId, issue: 'auth-required' })
        return
      }
      if (!stopped && failureCount >= FAILURE_NOTICE_THRESHOLD) {
        setIssueState({ userId: currentUserId, issue: navigator.onLine ? 'unavailable' : 'offline' })
      }
      clearRetryTimer()
      const delay = RETRY_DELAYS_MS[Math.min(failureCount - 1, RETRY_DELAYS_MS.length - 1)]
      retryTimer = setTimeout(() => attempt(), delay)
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
        .then(() => {
          saved = mergeSnapshots(saved, changes)
          succeeded()
        })
        .catch(failed)
        .finally(() => {
          running = undefined
          if (pending) save()
        })
    }
    const initialize = (): void => {
      if (stopped || running !== undefined) return
      running = synchronizeLearningData(database)
        .then(async () => {
          saved = await readLearningSnapshot(database)
          latest = saved
          initializing = false
          ready = true
          succeeded()
        })
        .catch(failed)
        .finally(() => {
          running = undefined
          if (!initializing && pending) save()
        })
    }
    const attempt = (): void => {
      clearRetryTimer()
      if (initializing) initialize()
      else save()
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

    initialize()

    const retryWhenOnline = (): void => attempt()
    const retryWhenVisible = (): void => { if (document.visibilityState === 'visible') attempt() }
    window.addEventListener('online', retryWhenOnline)
    document.addEventListener('visibilitychange', retryWhenVisible)

    return () => {
      stopped = true
      subscription.unsubscribe()
      if (timer !== undefined) clearTimeout(timer)
      clearRetryTimer()
      window.removeEventListener('online', retryWhenOnline)
      document.removeEventListener('visibilitychange', retryWhenVisible)
    }
  }, [database, retryGeneration, userId])

  return {
    issue: userId !== undefined && issueState?.userId === userId ? issueState.issue : null,
    retry,
  }
}

function mergeSnapshots(base: LearningSnapshot | undefined, changes: LearningSnapshot): LearningSnapshot {
  const progress = new Map(base?.progress.map((item) => [item.progressId, item]))
  const daySessions = new Map(base?.daySessions.map((item) => [item.contentId, item]))
  changes.progress.forEach((item) => progress.set(item.progressId, item))
  changes.daySessions.forEach((item) => daySessions.set(item.contentId, item))
  return { progress: [...progress.values()], daySessions: [...daySessions.values()] }
}
