import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { DayIndexItem, WordItem } from '../../types/word'

interface UseWordListDataOptions {
  open: boolean
  days: readonly DayIndexItem[]
  initialDay: number
  initialWords: readonly WordItem[]
  loadWords: (day: number) => Promise<WordItem[]>
}

export interface DisplayedWord {
  word: WordItem
  day: number
  position: number
}

export function useWordListData({
  open,
  days,
  initialDay,
  initialWords,
  loadWords,
}: UseWordListDataOptions) {
  const [listDay, setListDay] = useState(initialDay)
  const [wordsByDay, setWordsByDay] = useState(
    () => new Map<number, readonly WordItem[]>([[initialDay, initialWords]]),
  )
  const [loadingDay, setLoadingDay] = useState<number | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const requestedDayRef = useRef(initialDay)
  const loadWordsRef = useRef(loadWords)
  const searchRequestedDaysRef = useRef<Set<number>>(new Set())
  const searchSessionRef = useRef(0)
  const searchActive = searchQuery.trim().length > 0

  useEffect(() => {
    loadWordsRef.current = loadWords
  }, [loadWords])

  useEffect(() => {
    if (!open || !searchActive) return

    const missingDays = days
      .filter(({ day }) => !wordsByDay.has(day) && !searchRequestedDaysRef.current.has(day))
      .map(({ day }) => day)
    if (missingDays.length === 0) return

    const searchSession = searchSessionRef.current
    missingDays.forEach((day) => searchRequestedDaysRef.current.add(day))
    void Promise.allSettled(missingDays.map(async (day) => ({ day, words: await loadWordsRef.current(day) })))
      .then((results) => {
        const loadedResults = results.flatMap((result) => result.status === 'fulfilled' ? [result.value] : [])
        setWordsByDay((current) => {
          const next = new Map(current)
          loadedResults.forEach(({ day, words }) => next.set(day, words))
          return next
        })
        if (searchSessionRef.current === searchSession && results.some((result) => result.status === 'rejected')) {
          setSearchError('일부 Day를 불러오지 못했어요. 불러온 단어에서 검색했어요.')
        }
      })
      .finally(() => {
        if (searchSessionRef.current === searchSession) setSearchLoading(false)
      })
  }, [days, open, searchActive, wordsByDay])

  const selectListDay = useCallback(async (day: number): Promise<void> => {
    setListDay(day)
    requestedDayRef.current = day
    setLoadError(null)
    if (wordsByDay.has(day)) return
    setLoadingDay(day)
    try {
      const words = await loadWordsRef.current(day)
      setWordsByDay((current) => new Map(current).set(day, words))
    } catch {
      if (requestedDayRef.current === day) setLoadError(`Day ${day} 단어를 불러오지 못했어요.`)
    } finally {
      setLoadingDay((current) => current === day ? null : current)
    }
  }, [wordsByDay])

  const updateSearchQuery = useCallback((nextQuery: string): void => {
    const nextSearchActive = nextQuery.trim().length > 0
    setSearchQuery(nextQuery)
    setSearchError(null)
    if (!nextSearchActive) {
      searchRequestedDaysRef.current.clear()
      searchSessionRef.current += 1
    }
    setSearchLoading((current) => nextSearchActive
      ? (searchActive ? current : days.some(({ day }) => !wordsByDay.has(day)))
      : false)
  }, [days, searchActive, wordsByDay])

  const reset = useCallback((): void => {
    requestedDayRef.current = initialDay
    setListDay(initialDay)
    setWordsByDay((current) => new Map(current).set(initialDay, initialWords))
    setLoadingDay(null)
    setLoadError(null)
    setSearchQuery('')
    setSearchLoading(false)
    setSearchError(null)
    searchRequestedDaysRef.current.clear()
    searchSessionRef.current += 1
  }, [initialDay, initialWords])

  const words = wordsByDay.get(listDay)
  const displayedWords = useMemo<DisplayedWord[]>(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase()
    if (!normalizedQuery) {
      return (words ?? []).map((word, index) => ({ word, day: listDay, position: index + 1 }))
    }
    return days.flatMap(({ day }) => (wordsByDay.get(day) ?? []).flatMap((word, index) => (
      [word.word, word.meaning, word.pronunciation].some((value) => value.toLocaleLowerCase().includes(normalizedQuery))
        ? [{ word, day, position: index + 1 }]
        : []
    )))
  }, [days, listDay, searchQuery, words, wordsByDay])

  return {
    listDay,
    words,
    loadingDay,
    loadError,
    searchQuery,
    searchActive,
    searchLoading,
    searchError,
    displayedWords,
    selectListDay,
    updateSearchQuery,
    reset,
  }
}
