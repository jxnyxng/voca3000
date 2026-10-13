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
    const day = visibleDayNumbers[targetIndex]
    if (day === undefined) return
    buttonRefs.current.get(day)?.focus()
    if (targetIndex !== currentIndex) onSelectDay(day)
  }

  return (
    <section className="relative py-2 lg:flex lg:h-[calc(100dvh-9rem)] lg:min-h-0 lg:flex-col lg:overflow-visible" aria-label="Day 선택">
      <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:min-h-0 lg:flex-1 lg:flex-col lg:items-center lg:overflow-x-hidden lg:overflow-y-auto lg:pb-0" role="listbox" aria-label="학습 Day 선택" aria-orientation="vertical">
        {visibleDayNumbers.map((dayNumber, visibleIndex) => {
          const item = daysByNumber.get(dayNumber)
          const isAvailable = item !== undefined
          const isSelected = dayNumber === selectedDay
          const isCompleted = completedDays.has(dayNumber)
          const isPending = dayNumber === pendingDay

          return (
            <button
              key={dayNumber}
              ref={(node) => {
                if (node) buttonRefs.current.set(dayNumber, node)
                else buttonRefs.current.delete(dayNumber)
              }}
              type="button"
              role="option"
              aria-selected={isSelected}
              aria-label={isAvailable
                ? `Day ${dayNumber}, ${item.titleKo}, ${isCompleted ? '완료' : '미완료'}`
                : `Day ${dayNumber}, 준비 중`}
              aria-busy={isPending}
              tabIndex={isSelected || (selectedDay === undefined && visibleIndex === 0) ? 0 : -1}
              disabled={pendingDay !== undefined}
              className={cn(
                'relative flex h-10 w-11 shrink-0 items-center justify-center bg-transparent text-center transition-colors disabled:opacity-50 motion-reduce:transition-none',
                isSelected
                  ? 'font-extrabold text-toss-blue'
                  : 'font-semibold text-toss-muted hover:text-toss-text',
                isCompleted && 'underline decoration-2 underline-offset-4',
              )}
              onClick={() => onSelectDay(dayNumber)}
              onKeyDown={(event) => {
                if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
                  event.preventDefault()
                  moveFocus(visibleIndex, (visibleIndex + 1) % visibleDayNumbers.length)
                } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
                  event.preventDefault()
                  moveFocus(visibleIndex, (visibleIndex - 1 + visibleDayNumbers.length) % visibleDayNumbers.length)
                } else if (event.key === 'Home') {
                  event.preventDefault()
                  moveFocus(visibleIndex, 0)
                } else if (event.key === 'End') {
                  event.preventDefault()
                  moveFocus(visibleIndex, visibleDayNumbers.length - 1)
                }
              }}
            >
              {isSelected ? (
                <motion.span
                  layoutId={indicatorId}
                  className="absolute left-0 text-[0.625rem] font-extrabold uppercase tracking-[-0.03em] text-toss-blue"
                  transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                  aria-hidden="true"
                  data-day-indicator=""
                >
                  Day
                </motion.span>
              ) : null}
              <span className="text-sm">{dayNumber}</span>
            </button>
          )
        })}
      </div>
      <span className="pointer-events-none absolute top-0 -right-3 hidden h-full w-px bg-[linear-gradient(to_bottom,transparent,rgba(148,163,184,0.24)_50%,transparent)] lg:block" aria-hidden="true" />
      {errorMessage ? <p className="mt-2 text-sm text-toss-error" role="alert">{errorMessage}</p> : null}
    </section>
  )
}
