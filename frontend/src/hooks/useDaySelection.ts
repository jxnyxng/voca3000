import { useCallback, useRef, useState } from 'react'
import type { DayIndexItem, StudyLanguage } from '../types/word'

const SELECTED_DAY_KEY = 'voca3000:selected-day'

function storageKey(language: StudyLanguage): string {
  return language === 'ja' ? `${SELECTED_DAY_KEY}:ja` : SELECTED_DAY_KEY
}

export function readLastSelectedDay(language: StudyLanguage): number | undefined {
  if (typeof window === 'undefined') return undefined
  try {
    const value = window.localStorage.getItem(storageKey(language))
    if (value === null) return undefined
    const day = Number(value)
    return Number.isInteger(day) && day >= 1 && day <= 100 ? day : undefined
  } catch {
    return undefined
  }
}

function readStoredDay(days: readonly DayIndexItem[]): number | undefined {
  const stored = readLastSelectedDay(days[0]?.language ?? 'en')
  return days.some(({ day }) => day === stored) ? stored : days[0]?.day
}

function storeDay(day: number, language: StudyLanguage): void {
  try {
    window.localStorage.setItem(storageKey(language), String(day))
  } catch {
    // Day persistence is a UI preference; storage failure must not block learning.
  }
}

export interface UseDaySelectionOptions {
  days: readonly DayIndexItem[]
  prepareDay?: (day: number) => Promise<void>
}

export interface UseDaySelectionResult {
  selectedDay: number | undefined
  pendingDay: number | undefined
  selectionError: Error | null
  selectDay: (day: number) => Promise<boolean>
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error('Day selection failed.', { cause: error })
}

export function useDaySelection({ days, prepareDay }: UseDaySelectionOptions): UseDaySelectionResult {
  const [selectedDayState, setSelectedDay] = useState<number | undefined>(() => readStoredDay(days))
  const [pendingDay, setPendingDay] = useState<number>()
  const [selectionError, setSelectionError] = useState<Error | null>(null)
  const selectionRequestRef = useRef(0)
  const selectedDay = days.some(({ day }) => day === selectedDayState)
    ? selectedDayState
    : readStoredDay(days)

  const selectDay = useCallback(
    async (day: number): Promise<boolean> => {
      if (!days.some((item) => item.day === day)) {
        return false
      }
      const requestId = selectionRequestRef.current + 1
      selectionRequestRef.current = requestId
      if (day === selectedDay) {
        if (day !== selectedDayState) {
          setSelectedDay(day)
          storeDay(day, days[0]?.language ?? 'en')
        }
        setSelectionError(null)
        return true
      }

      setSelectedDay(day)
      storeDay(day, days[0]?.language ?? 'en')
      setPendingDay(day)
      setSelectionError(null)
      try {
        await prepareDay?.(day)
        return true
      } catch (error) {
        if (selectionRequestRef.current === requestId) {
          setSelectionError(toError(error))
        }
        return false
      } finally {
        if (selectionRequestRef.current === requestId) {
          setPendingDay(undefined)
        }
      }
    },
    [days, prepareDay, selectedDay, selectedDayState],
  )

  return { selectedDay, pendingDay, selectionError, selectDay }
}
