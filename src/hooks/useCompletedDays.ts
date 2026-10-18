import { useCallback, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { VocaDatabase } from '../db'
import { builtinContentId } from '../types/content'
import type { StudyLanguage } from '../types/word'

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error('학습 기록을 불러오지 못했어요.', { cause: error })
}

export function useCompletedDays(database: VocaDatabase, language: StudyLanguage) {
  const [retryCount, setRetryCount] = useState(0)
  const snapshot = useLiveQuery(
    async () => {
      try {
        const sessions = await database.daySessions.toArray()
        return {
          days: new Set(Array.from({ length: 100 }, (_, index) => index + 1).filter((day) => (
            sessions.some((session) => session.contentId === builtinContentId(language, day) && session.completedStudy)
          ))),
          error: null,
        }
      } catch (error) {
        return { days: new Set<number>(), error: toError(error) }
      }
    },
    [database, language, retryCount],
  )
  const retry = useCallback(() => setRetryCount((count) => count + 1), [])

  return {
    days: snapshot?.days ?? new Set<number>(),
    error: snapshot?.error ?? null,
    retry,
  }
}
