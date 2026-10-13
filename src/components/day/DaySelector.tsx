import { motion } from 'motion/react'
import { useId, useRef } from 'react'
import type { DayIndexItem } from '../../types/word'
import { cn } from '../../utils/cn'

export interface DaySelectorProps {
  days: readonly DayIndexItem[]
  selectedDay: number | undefined
  completedDays: ReadonlySet<number>
  pendingDay?: number
  errorMessage?: string
  totalDays?: number
  onSelectDay: (day: number) => void
}

export function DaySelector({
  days,
  selectedDay,
  completedDays,
  pendingDay,
  errorMessage,
  totalDays,
  onSelectDay,
}: DaySelectorProps) {
  const indicatorId = `${useId()}-day-indicator`
  const buttonRefs = useRef(new Map<number, HTMLButtonElement>())
  const daysByNumber = new Map(days.map((item) => [item.day, item]))
  const visibleDayNumbers = totalDays === undefined
    ? days.map(({ day }) => day)
    : Array.from({ length: totalDays }, (_, index) => index + 1)

  const moveFocus = (currentIndex: number, targetIndex: number): void => {
    const day = days[targetIndex]?.day
    if (day === undefined) return
    buttonRefs.current.get(day)?.focus()
    if (targetIndex !== currentIndex) onSelectDay(day)
  }

  return (
    <section className="py-2 lg:flex lg:h-[calc(100dvh-9rem)] lg:min-h-0 lg:flex-col lg:overflow-hidden" aria-labelledby="day-selector-title">
      <h2 id="day-selector-title" className="mb-2 text-xs font-bold text-toss-muted lg:text-center">DAY</h2>
      <div className="flex gap-2 overflow-x-auto pb-2 lg:min-h-0 lg:flex-1 lg:flex-col lg:items-center lg:overflow-x-hidden lg:overflow-y-auto lg:pb-0" role="listbox" aria-label="학습 Day 선택" aria-orientation="vertical">
        {visibleDayNumbers.map((dayNumber) => {
          const item = daysByNumber.get(dayNumber)
          const availableIndex = days.findIndex(({ day }) => day === dayNumber)
          const isAvailable = item !== undefined
          const isSelected = dayNumber === selectedDay
          const isCompleted = completedDays.has(dayNumber)
          const isPending = dayNumber === pendingDay

          return (
            <button
              key={dayNumber}
              ref={(node) => {
                if (node && isAvailable) buttonRefs.current.set(dayNumber, node)
                else buttonRefs.current.delete(dayNumber)
              }}
              type="button"
              role="option"
              aria-selected={isSelected}
              aria-label={isAvailable
                ? `Day ${dayNumber}, ${item.titleKo}, ${isCompleted ? '완료' : '미완료'}`
                : `Day ${dayNumber}, 준비 중`}
              aria-busy={isPending}
              tabIndex={isAvailable && (isSelected || (selectedDay === undefined && availableIndex === 0)) ? 0 : -1}
              disabled={!isAvailable || pendingDay !== undefined}
              className={cn(
                'relative flex h-10 w-11 shrink-0 items-center justify-center bg-transparent text-center transition-colors disabled:opacity-50 motion-reduce:transition-none',
                isSelected
                  ? 'font-extrabold text-toss-blue'
                  : 'font-semibold text-toss-muted hover:text-toss-text',
                isCompleted && 'underline decoration-2 underline-offset-4',
              )}
              onClick={() => onSelectDay(dayNumber)}
              onKeyDown={(event) => {
                if (availableIndex < 0) return
                if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
                  event.preventDefault()
                  moveFocus(availableIndex, (availableIndex + 1) % days.length)
                } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
                  event.preventDefault()
                  moveFocus(availableIndex, (availableIndex - 1 + days.length) % days.length)
                } else if (event.key === 'Home') {
                  event.preventDefault()
                  moveFocus(availableIndex, 0)
                } else if (event.key === 'End') {
                  event.preventDefault()
                  moveFocus(availableIndex, days.length - 1)
                }
              }}
            >
              {isSelected ? (
                <motion.span
                  layoutId={indicatorId}
                  className="absolute left-0 text-base font-black text-toss-blue"
                  transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                  aria-hidden="true"
                  data-day-indicator=""
                >
                  &gt;
                </motion.span>
              ) : null}
              <span className="text-sm">{dayNumber}</span>
            </button>
          )
        })}
      </div>
      {errorMessage ? <p className="mt-2 text-sm text-toss-error" role="alert">{errorMessage}</p> : null}
    </section>
  )
}
