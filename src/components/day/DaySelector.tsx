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
  onSelectDay: (day: number) => void
}

export function DaySelector({
  days,
  selectedDay,
  completedDays,
  pendingDay,
  errorMessage,
  onSelectDay,
}: DaySelectorProps) {
  const indicatorId = `${useId()}-day-indicator`
  const buttonRefs = useRef(new Map<number, HTMLButtonElement>())

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
        {days.map((item, index) => {
          const isSelected = item.day === selectedDay
          const isCompleted = completedDays.has(item.day)
          const isPending = item.day === pendingDay

          return (
            <button
              key={item.day}
              ref={(node) => {
                if (node) buttonRefs.current.set(item.day, node)
                else buttonRefs.current.delete(item.day)
              }}
              type="button"
              role="option"
              aria-selected={isSelected}
              aria-label={`Day ${item.day}, ${item.titleKo}, ${isCompleted ? '완료' : '미완료'}`}
              aria-busy={isPending}
              tabIndex={isSelected || (selectedDay === undefined && index === 0) ? 0 : -1}
              disabled={pendingDay !== undefined}
              className={cn(
                'relative flex h-10 w-11 shrink-0 items-center justify-center bg-transparent text-center transition-colors disabled:opacity-50 motion-reduce:transition-none',
                isSelected
                  ? 'font-extrabold text-toss-blue'
                  : 'font-semibold text-toss-muted hover:text-toss-text',
                isCompleted && 'underline decoration-2 underline-offset-4',
              )}
              onClick={() => onSelectDay(item.day)}
              onKeyDown={(event) => {
                if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
                  event.preventDefault()
                  moveFocus(index, (index + 1) % days.length)
                } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
                  event.preventDefault()
                  moveFocus(index, (index - 1 + days.length) % days.length)
                } else if (event.key === 'Home') {
                  event.preventDefault()
                  moveFocus(index, 0)
                } else if (event.key === 'End') {
                  event.preventDefault()
                  moveFocus(index, days.length - 1)
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
              <span className="text-sm">{item.day}</span>
            </button>
          )
        })}
      </div>
      {errorMessage ? <p className="mt-2 text-sm text-toss-error" role="alert">{errorMessage}</p> : null}
    </section>
  )
}
