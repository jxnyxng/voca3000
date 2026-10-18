import { useEffect, useId, useRef, type PointerEventHandler } from 'react'
import { Search } from 'lucide-react'
import { motion } from 'motion/react'
import type { DayIndexItem } from '../../types/word'
import { cn } from '../../utils/cn'

interface WordListHeaderProps {
  open: boolean
  days: readonly DayIndexItem[]
  listDay: number
  searchQuery: string
  shouldReduceMotion: boolean | null
  onClose: () => void
  onSelectDay: (day: number) => void
  onSearchQueryChange: (query: string) => void
  onPointerDown: PointerEventHandler<HTMLDivElement>
}

export function WordListHeader({
  open,
  days,
  listDay,
  searchQuery,
  shouldReduceMotion,
  onClose,
  onSelectDay,
  onSearchQueryChange,
  onPointerDown,
}: WordListHeaderProps) {
  const dayIndicatorId = useId()
  const selectedDayRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (open) selectedDayRef.current?.scrollIntoView?.({
      behavior: shouldReduceMotion ? 'auto' : 'smooth',
      inline: 'center',
    })
  }, [listDay, open, shouldReduceMotion])

  return (
    <div
      data-word-list-drag-header
      className="shrink-0 cursor-grab select-none touch-pan-x border-b border-toss-border active:cursor-grabbing [-webkit-user-drag:none]"
      onPointerDown={onPointerDown}
    >
      <div
        role="button"
        tabIndex={0}
        className="group flex h-9 items-center justify-center"
        aria-label="단어 리스트 닫기"
        draggable={false}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onClose()
          }
        }}
      >
        <span className="h-1 w-10 rounded-full bg-toss-border transition-colors group-hover:bg-toss-muted" />
      </div>

      <div className="px-4 pb-2 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="text-sm font-bold text-toss-blue">Day {String(listDay).padStart(2, '0')}</span>
            <h2 id="word-list-title" className="text-base font-extrabold text-toss-text">단어 리스트</h2>
          </div>

          <label className="flex h-9 w-1/2 min-w-0 shrink-0 items-center gap-2 rounded-xl bg-toss-bg px-3 text-toss-muted ring-1 ring-inset ring-toss-border transition-colors focus-within:bg-toss-surface focus-within:ring-toss-blue">
            <Search className="size-4 shrink-0" aria-hidden="true" />
            <span className="sr-only">단어 검색</span>
            <input
              type="search"
              value={searchQuery}
              placeholder="단어 또는 뜻 검색"
              className="min-w-0 flex-1 bg-transparent text-sm font-medium text-toss-text outline-none placeholder:text-toss-muted/70"
              onChange={(event) => onSearchQueryChange(event.target.value)}
            />
          </label>
        </div>

        <div className="mt-2 flex gap-1 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="listbox" aria-label="단어 리스트 Day 선택">
          {days.map(({ day }) => {
            const selected = day === listDay
            return (
              <button
                key={day}
                ref={selected ? selectedDayRef : undefined}
                type="button"
                role="option"
                aria-selected={selected}
                className={cn(
                  'relative flex size-8 shrink-0 items-center justify-center rounded-lg bg-transparent text-center transition-colors motion-reduce:transition-none sm:size-9',
                  selected
                    ? 'font-extrabold text-toss-blue'
                    : 'font-semibold text-toss-muted hover:bg-toss-border/60 hover:text-toss-text',
                )}
                onClick={() => onSelectDay(day)}
              >
                <span className={cn(
                  'relative transition-[font-size] duration-300 motion-reduce:transition-none',
                  selected ? 'text-base' : 'text-sm',
                )}>
                  {day}
                  {selected ? (
                    <motion.span
                      data-word-list-day-indicator
                      layoutId={`${dayIndicatorId}-word-list-day`}
                      className="absolute -bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-toss-blue"
                    />
                  ) : null}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
