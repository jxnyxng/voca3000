import { useCallback, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  db,
  markStudyCompleted as markStudyCompletedInDb,
  recordQuizResult as recordQuizResultInDb,
  toggleMastered as toggleMasteredInDb,
  updateQuizHighScore as updateQuizHighScoreInDb,
  type VocaDatabase,
} from '../db'
import type { DaySessionSummary, UserProgressRecord } from '../types/progress'
import type { QuizMode } from '../types/word'
import { builtinContentId, type LearningContentId } from '../types/content'

interface ProgressSnapshot {
  queryKey: string
  progressByWordId: Map<string, UserProgressRecord>
  daySession: DaySessionSummary | undefined
  error: Error | null
}

export interface UseWordProgressOptions {
  wordIds: readonly string[]
  contentId?: LearningContentId
  day?: number
  database?: VocaDatabase
}

export interface UseWordProgressResult {
  progressByWordId: Map<string, UserProgressRecord>
  masteredCount: number
  daySession: DaySessionSummary | undefined
  isLoading: boolean
  error: Error | null
  retry: () => void
  toggleMastered: (wordId: string) => Promise<boolean>
  recordQuizResult: (wordId: string, mode: QuizMode, isCorrect: boolean) => Promise<void>
  markStudyCompleted: () => Promise<void>
  updateQuizHighScore: (mode: QuizMode, score: number) => Promise<boolean>
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error('IndexedDB query failed.', { cause: error })
}

export function useWordProgress({
  wordIds,
  contentId: requestedContentId,
  day,
  database = db,
}: UseWordProgressOptions): UseWordProgressResult {
  const contentId = requestedContentId ?? builtinContentId('en', day ?? 1)
  const wordIdsKey = wordIds.join('\u0000')
  const stableWordIds = useMemo(
    () => (wordIdsKey === '' ? [] : wordIdsKey.split('\u0000')),
    [wordIdsKey],
  )
  const [retryCount, setRetryCount] = useState(0)
  const queryKey = `${contentId}:${wordIdsKey}:${retryCount}`

  const snapshot = useLiveQuery<ProgressSnapshot>(
    async () => {
      try {
        const [records, daySession] = await Promise.all([
          database.progress.bulkGet(stableWordIds.map((wordId) => `${contentId}::${wordId}`)),
          database.daySessions.get(contentId),
        ])
        const progressByWordId = new Map<string, UserProgressRecord>()
        records.forEach((record) => {
          if (record !== undefined) {
            progressByWordId.set(record.wordId, record)
          }
        })

        return { queryKey, progressByWordId, daySession, error: null }
      } catch (error) {
        return {
          queryKey,
          progressByWordId: new Map<string, UserProgressRecord>(),
          daySession: undefined,
          error: toError(error),
        }
      }
    },
    [database, queryKey],
  )

  const isCurrentSnapshot = snapshot?.queryKey === queryKey
  const progressByWordId = isCurrentSnapshot
    ? snapshot.progressByWordId
    : new Map<string, UserProgressRecord>()
  const daySession = isCurrentSnapshot ? snapshot.daySession : undefined
  const error = isCurrentSnapshot ? snapshot.error : null
  const masteredCount = [...progressByWordId.values()].filter(
    (record) => record.isMastered,
  ).length

  const retry = useCallback(() => {
    setRetryCount((count) => count + 1)
  }, [])

  const toggleMastered = useCallback(
    (wordId: string) => toggleMasteredInDb(contentId, wordId, database),
    [contentId, database],
  )
  const recordQuizResult = useCallback(
    (wordId: string, mode: QuizMode, isCorrect: boolean) =>
      recordQuizResultInDb(contentId, wordId, mode, isCorrect, database),
    [contentId, database],
  )
  const markStudyCompleted = useCallback(
    () => markStudyCompletedInDb(contentId, database),
    [contentId, database],
  )
  const updateQuizHighScore = useCallback(
    (mode: QuizMode, score: number) => updateQuizHighScoreInDb(contentId, mode, score, database),
    [contentId, database],
  )

  return {
    progressByWordId,
    masteredCount,
    daySession,
    isLoading: !isCurrentSnapshot,
    error,
    retry,
    toggleMastered,
    recordQuizResult,
    markStudyCompleted,
    updateQuizHighScore,
  }
}
