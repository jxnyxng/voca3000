import { useCallback, useEffect, useState } from 'react'
import type { DayIndexItem } from '../types/word'

export interface DayIndexRepository {
  clearCache: () => void
  getDayIndex: () => Promise<DayIndexItem[]>
}

interface DayIndexState {
  days: DayIndexItem[] | null
  error: Error | null
  cacheKey?: string
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error('데이터를 불러오지 못했어요.', { cause: error })
}

export function useDayIndex(
  repository: DayIndexRepository,
  cacheKey: string | undefined,
) {
  const [retryCount, setRetryCount] = useState(0)
  const [state, setState] = useState<DayIndexState>({ days: null, error: null })

  useEffect(() => {
    if (cacheKey === undefined) return
    let active = true
    void repository.getDayIndex()
      .then((days) => {
        if (active) setState({ days, error: null, cacheKey })
      })
      .catch((error: unknown) => {
        if (active) setState({ days: null, error: toError(error), cacheKey })
      })
    return () => {
      active = false
    }
  }, [cacheKey, repository, retryCount])

  const retry = useCallback((): void => {
    repository.clearCache()
    setState({ days: null, error: null })
    setRetryCount((count) => count + 1)
  }, [repository])

  return state.cacheKey === cacheKey
    ? { days: state.days, error: state.error, retry }
    : { days: null, error: null, retry }
}
