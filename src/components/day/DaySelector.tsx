import { CheckCircle2, LoaderCircle } from 'lucide-react'
import { useRef } from 'react'
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
  const buttonRefs = useRef(new Map<number, HTMLButtonElement>())

  const moveFocus = (currentIndex: number, targetIndex: number): void => {
    const day = days[targetIndex]?.day
    if (day === undefined) return
    buttonRefs.current.get(day)?.focus()
    if (targetIndex !== currentIndex) onSelectDay(day)
  }

  return (
    <section className="rounded-toss-card border border-toss-border bg-toss-surface p-3 shadow-toss lg:flex lg:h-[calc(100dvh-9rem)] lg:min-h-0 lg:flex-col lg:overflow-hidden lg:px-2 lg:py-3" aria-labelledby="day-selector-title">
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
              tabIndex={isSelected || (selectedDay === undefined && index === 0) ? 0 : -1}
              disabled={pendingDay !== undefined}
              className={cn(
                'flex size-11 shrink-0 items-center justify-center rounded-[12px] border text-center transition-colors motion-reduce:transition-none lg:w-11',
                isSelected
                  ? 'border-toss-blue bg-toss-blue text-white'
                  : 'border-toss-border bg-toss-surface text-toss-text hover:bg-toss-bg',
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
              <span className="relative text-sm font-extrabold">
                {item.day}
                {isPending ? (
                  <LoaderCircle className="absolute -right-4 -top-1 size-3 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                ) : isCompleted ? (
                  <CheckCircle2 className={cn('absolute -right-4 -top-1 size-3', isSelected ? 'text-white' : 'text-toss-success')} aria-hidden="true" />
                ) : null}
              </span>
            </button>
          )
        })}
      </div>
      {errorMessage ? <p className="mt-2 text-sm text-toss-error" role="alert">{errorMessage}</p> : null}
    </section>
  )
}
