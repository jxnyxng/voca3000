import { useCallback, useEffect, useRef, useState } from 'react'
import type { WordItem } from '../types/word'

export interface DayWordsRepository {
  getWordsForDay: (day: number) => Promise<WordItem[]>
}

interface DayWordsState {
  wordsByDay: Map<number, WordItem[]>
  loadingDays: Set<number>
  errorsByDay: Map<number, Error>
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error('데이터를 불러오지 못했어요.', { cause: error })
}

function emptyState(): DayWordsState {
  return {
    wordsByDay: new Map(),
    loadingDays: new Set(),
    errorsByDay: new Map(),
  }
}

export function useDayWords(repository: DayWordsRepository) {
  const [state, setState] = useState<DayWordsState>(emptyState)
  const wordsRef = useRef(state.wordsByDay)
  const inFlightRef = useRef(new Map<number, Promise<void>>())
  const generationRef = useRef(0)

  useEffect(() => () => {
    generationRef.current += 1
    inFlightRef.current.clear()
  }, [])

  const loadDay = useCallback((day: number): Promise<void> => {
    if (wordsRef.current.has(day)) return Promise.resolve()
    const existingRequest = inFlightRef.current.get(day)
    if (existingRequest !== undefined) return existingRequest

    const generation = generationRef.current
    setState((current) => {
      const loadingDays = new Set(current.loadingDays).add(day)
      const errorsByDay = new Map(current.errorsByDay)
      errorsByDay.delete(day)
      return { ...current, loadingDays, errorsByDay }
    })

    const request = repository.getWordsForDay(day)
      .then((words) => {
        if (generation !== generationRef.current) return
        const wordsByDay = new Map(wordsRef.current).set(day, words)
        wordsRef.current = wordsByDay
        setState((current) => {
          const loadingDays = new Set(current.loadingDays)
          const errorsByDay = new Map(current.errorsByDay)
          loadingDays.delete(day)
          errorsByDay.delete(day)
          return { wordsByDay, loadingDays, errorsByDay }
        })
      })
      .catch((error: unknown) => {
        const normalizedError = toError(error)
        if (generation === generationRef.current) {
          setState((current) => {
            const loadingDays = new Set(current.loadingDays)
            const errorsByDay = new Map(current.errorsByDay).set(day, normalizedError)
            loadingDays.delete(day)
            return { ...current, loadingDays, errorsByDay }
          })
        }
        throw normalizedError
      })
      .finally(() => {
        if (inFlightRef.current.get(day) === request) inFlightRef.current.delete(day)
      })

    inFlightRef.current.set(day, request)
    return request
  }, [repository])

  const retryDay = useCallback((day: number): void => {
    void loadDay(day).catch(() => undefined)
  }, [loadDay])

  return { ...state, loadDay, retryDay }
}
