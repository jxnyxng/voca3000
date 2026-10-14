import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useLayoutEffect, useRef, useState } from 'react'
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
  const buttonRefs = useRef(new Map<number, HTMLButtonElement>())
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [scrollShadows, setScrollShadows] = useState({ top: false, bottom: false })
  const daysByNumber = new Map(days.map((item) => [item.day, item]))
  const visibleDayNumbers = totalDays === undefined
    ? days.map(({ day }) => day)
    : Array.from({ length: totalDays }, (_, index) => index + 1)

  const updateScrollShadows = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return
    const maxScrollTop = container.scrollHeight - container.clientHeight
    setScrollShadows({
      top: container.scrollTop > 1,
      bottom: maxScrollTop > 1 && container.scrollTop < maxScrollTop - 1,
    })
  }, [])

  useLayoutEffect(() => {
    updateScrollShadows()
    window.addEventListener('resize', updateScrollShadows)
    const observer = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(updateScrollShadows)
    if (scrollContainerRef.current) observer?.observe(scrollContainerRef.current)
    return () => {
      window.removeEventListener('resize', updateScrollShadows)
      observer?.disconnect()
    }
  }, [updateScrollShadows, visibleDayNumbers.length])

  const centerSelectedDay = useCallback(() => {
    if (selectedDay === undefined) return
    const container = scrollContainerRef.current
    const selectedButton = buttonRefs.current.get(selectedDay)
    if (!container || !selectedButton || typeof container.scrollTo !== 'function') return

    if (window.innerWidth < 1024) {
      const maxScrollLeft = Math.max(0, container.scrollWidth - container.clientWidth)
      const centeredScrollLeft = selectedButton.offsetLeft
        - (container.clientWidth - selectedButton.offsetWidth) / 2
      const targetScrollLeft = Math.min(maxScrollLeft, Math.max(0, centeredScrollLeft))
      container.scrollTo({ left: targetScrollLeft, behavior: 'smooth' })
      return
    }

    const maxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight)
    const centeredScrollTop = selectedButton.offsetTop
      - (container.clientHeight - selectedButton.offsetHeight) / 2
    const targetScrollTop = Math.min(maxScrollTop, Math.max(0, centeredScrollTop))
    container.scrollTo({ top: targetScrollTop, behavior: 'smooth' })
  }, [selectedDay])

  useLayoutEffect(() => {
    centerSelectedDay()
    window.addEventListener('resize', centerSelectedDay)
    return () => window.removeEventListener('resize', centerSelectedDay)
  }, [centerSelectedDay])

  const moveFocus = (currentIndex: number, targetIndex: number): void => {
    const day = visibleDayNumbers[targetIndex]
    if (day === undefined) return
    buttonRefs.current.get(day)?.focus()
    if (targetIndex !== currentIndex) onSelectDay(day)
  }

  return (
    <section className="relative py-2 lg:flex lg:h-[calc(100dvh-9rem)] lg:min-h-0 lg:flex-col lg:overflow-visible" aria-label="Day 선택">
      <div ref={scrollContainerRef} onScroll={updateScrollShadows} className="flex gap-1 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:min-h-0 lg:flex-1 lg:flex-col lg:items-center lg:overflow-x-hidden lg:overflow-y-auto lg:pb-0" role="listbox" aria-label="학습 Day 선택" aria-orientation="vertical">
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
                'relative flex size-9 shrink-0 items-center justify-center rounded-lg bg-transparent text-center transition-colors disabled:opacity-50 motion-reduce:transition-none lg:left-2',
                isSelected
                  ? 'font-extrabold text-toss-blue'
                  : 'font-semibold text-toss-muted hover:bg-toss-border/60 hover:text-toss-text',
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
              <span className={cn('relative transition-[font-size] duration-300 motion-reduce:transition-none', isSelected ? 'text-base' : 'text-sm')}>
                <AnimatePresence initial>
                  {isSelected ? (
                    <>
                      <motion.span
                        key={`day-mobile-indicator-${dayNumber}`}
                        className="absolute -bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-toss-blue lg:hidden"
                        initial={{ opacity: 0, scale: 0.4 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.4 }}
                        transition={{ duration: 0.18 }}
                        aria-hidden="true"
                        data-day-mobile-indicator=""
                      />
                      <motion.span
                        key={`day-desktop-indicator-${dayNumber}`}
                        className="absolute top-1/2 right-full mr-1.5 hidden w-max -translate-y-1/2 whitespace-nowrap text-[0.625rem] font-extrabold uppercase tracking-[-0.03em] text-toss-blue lg:block"
                        initial={{ opacity: 0, x: -12 }}
                        animate={{
                          opacity: 1,
                          x: 0,
                          transition: { type: 'spring', stiffness: 280, damping: 20, mass: 0.8 },
                        }}
                        exit={{
                          opacity: 0,
                          x: -10,
                          transition: { duration: 0.28, ease: [0.4, 0, 1, 1] },
                        }}
                        aria-hidden="true"
                        data-day-indicator=""
                      >
                        Day
                      </motion.span>
                    </>
                  ) : null}
                </AnimatePresence>
                {dayNumber}
              </span>
            </button>
          )
        })}
      </div>
      {scrollShadows.top ? <span className="pointer-events-none absolute inset-x-0 top-0 z-10 hidden h-8 bg-gradient-to-b from-toss-bg via-toss-bg/80 to-transparent lg:block" aria-hidden="true" data-day-scroll-shadow="top" /> : null}
      {scrollShadows.bottom ? <span className="pointer-events-none absolute inset-x-0 bottom-0 z-10 hidden h-10 bg-gradient-to-t from-toss-bg via-toss-bg/80 to-transparent lg:block" aria-hidden="true" data-day-scroll-shadow="bottom" /> : null}
      <span className="pointer-events-none absolute top-0 right-0 hidden h-full w-px bg-[linear-gradient(to_bottom,transparent,rgba(148,163,184,0.24)_50%,transparent)] lg:block" aria-hidden="true" />
      {errorMessage ? <p className="mt-2 text-sm text-toss-error" role="alert">{errorMessage}</p> : null}
    </section>
  )
}
