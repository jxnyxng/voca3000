import { useCallback, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { VocaDatabase } from '../db'

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error('학습 기록을 불러오지 못했어요.', { cause: error })
}

export function useCompletedDays(database: VocaDatabase) {
  const [retryCount, setRetryCount] = useState(0)
  const snapshot = useLiveQuery(
    async () => {
      try {
        const sessions = await database.daySessions.toArray()
        return {
          days: new Set(sessions.filter(({ completedStudy }) => completedStudy).map(({ day }) => day)),
          error: null,
        }
      } catch (error) {
        return { days: new Set<number>(), error: toError(error) }
      }
    },
    [database, retryCount],
  )
  const retry = useCallback(() => setRetryCount((count) => count + 1), [])

  return {
    days: snapshot?.days ?? new Set<number>(),
    error: snapshot?.error ?? null,
    retry,
  }
}
