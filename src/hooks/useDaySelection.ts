import { useCallback, useState } from 'react'
import type { DayIndexItem } from '../types/word'

const SELECTED_DAY_KEY = 'voca3000:selected-day'

function readStoredDay(days: readonly DayIndexItem[]): number | undefined {
  if (typeof window === 'undefined') return days[0]?.day

  try {
    const stored = Number(window.localStorage.getItem(SELECTED_DAY_KEY))
    return days.some(({ day }) => day === stored) ? stored : days[0]?.day
  } catch {
    return days[0]?.day
  }
}

function storeDay(day: number): void {
  try {
    window.localStorage.setItem(SELECTED_DAY_KEY, String(day))
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
  const selectedDay = days.some(({ day }) => day === selectedDayState)
    ? selectedDayState
    : readStoredDay(days)

  const selectDay = useCallback(
    async (day: number): Promise<boolean> => {
      if (!days.some((item) => item.day === day) || pendingDay !== undefined) {
        return false
      }
      if (day === selectedDay) {
        if (day !== selectedDayState) {
          setSelectedDay(day)
          storeDay(day)
        }
        setSelectionError(null)
        return true
      }

      setPendingDay(day)
      setSelectionError(null)
      try {
        await prepareDay?.(day)
        setSelectedDay(day)
        storeDay(day)
        return true
      } catch (error) {
        setSelectionError(toError(error))
        return false
      } finally {
        setPendingDay(undefined)
      }
    },
    [days, pendingDay, prepareDay, selectedDay, selectedDayState],
  )

  return { selectedDay, pendingDay, selectionError, selectDay }
}
