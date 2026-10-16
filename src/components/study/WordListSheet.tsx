import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useDragControls, useReducedMotion } from 'motion/react'
import type { DayIndexItem, WordItem } from '../../types/word'
import { cn } from '../../utils/cn'

export interface WordListSheetProps {
  open: boolean
  days: readonly DayIndexItem[]
  initialDay: number
  initialWords: readonly WordItem[]
  loadWords: (day: number) => Promise<WordItem[]>
  onClose: () => void
}

export function WordListSheet({
  open,
  days,
  initialDay,
  initialWords,
  loadWords,
  onClose,
}: WordListSheetProps) {
  const shouldReduceMotion = useReducedMotion()
  const dragControls = useDragControls()
  const [listDay, setListDay] = useState(initialDay)
  const [wordsByDay, setWordsByDay] = useState(
    () => new Map<number, readonly WordItem[]>([[initialDay, initialWords]]),
  )
  const [loadingDay, setLoadingDay] = useState<number | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const selectedDayRef = useRef<HTMLButtonElement | null>(null)
  const requestedDayRef = useRef(initialDay)

  const closeSheet = useCallback((): void => {
    requestedDayRef.current = initialDay
    setListDay(initialDay)
    setWordsByDay((current) => new Map(current).set(initialDay, initialWords))
    setLoadError(null)
    onClose()
  }, [initialDay, initialWords, onClose])

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') closeSheet()
    }
    document.addEventListener('keydown', handleKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [closeSheet, open])

  useEffect(() => {
    if (open) selectedDayRef.current?.scrollIntoView?.({ behavior: shouldReduceMotion ? 'auto' : 'smooth', inline: 'center' })
  }, [listDay, open, shouldReduceMotion])

  const selectListDay = async (day: number): Promise<void> => {
    setListDay(day)
    requestedDayRef.current = day
    setLoadError(null)
    if (wordsByDay.has(day)) return
    setLoadingDay(day)
    try {
      const loadedWords = await loadWords(day)
      setWordsByDay((current) => new Map(current).set(day, loadedWords))
    } catch {
      if (requestedDayRef.current === day) setLoadError(`Day ${day} 단어를 불러오지 못했어요.`)
    } finally {
      setLoadingDay((current) => current === day ? null : current)
    }
  }

  const words = wordsByDay.get(listDay)

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="단어 리스트 닫기"
            className="fixed inset-x-0 bottom-0 top-[3.75rem] z-40 cursor-default bg-slate-900/15 backdrop-blur-[1px] sm:top-[4.5rem]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: shouldReduceMotion ? 0.01 : 0.24 }}
            onClick={closeSheet}
          />
          <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 mx-auto grid w-full max-w-5xl lg:grid-cols-[4.5rem_minmax(0,1fr)] lg:gap-8 lg:px-8">
            <div className="hidden lg:block" aria-hidden="true" />
            <motion.section
              role="dialog"
              aria-modal="true"
              aria-labelledby="word-list-title"
              className="pointer-events-auto flex h-[calc(100dvh-4.25rem)] min-h-0 flex-col overflow-hidden rounded-t-[1.75rem] border border-b-0 border-toss-border bg-toss-surface shadow-2xl sm:h-[calc(100dvh-5rem)] lg:h-[calc(100dvh-8rem)]"
              initial={shouldReduceMotion ? { opacity: 0 } : { y: '100%', opacity: 0.8 }}
              animate={{ y: 0, opacity: 1 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { y: '100%', opacity: 0.8 }}
              transition={shouldReduceMotion ? { duration: 0.01 } : { type: 'spring', stiffness: 330, damping: 34, mass: 0.9 }}
              drag={shouldReduceMotion ? false : 'y'}
              dragControls={dragControls}
              dragListener={false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.28 }}
              onDragEnd={(_event, info) => {
                if (info.offset.y > 120 || info.velocity.y > 700) closeSheet()
              }}
            >
              <div
                role="button"
                tabIndex={0}
                className="group flex h-9 shrink-0 items-center justify-center"
                aria-label="단어 리스트 닫기"
                onPointerDown={(event) => {
                  if (!shouldReduceMotion) dragControls.start(event)
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    closeSheet()
                  }
                }}
              >
                <span className="h-1 w-10 rounded-full bg-toss-border transition-colors group-hover:bg-toss-muted" />
              </div>

              <div className="shrink-0 border-b border-toss-border px-4 pb-3 sm:px-6">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <h2 id="word-list-title" className="text-xl font-extrabold text-toss-text">단어 리스트</h2>
                    <p className="mt-0.5 text-xs text-toss-muted">리스트 안에서 다른 Day도 확인할 수 있어요.</p>
                  </div>
                  <span className="shrink-0 text-sm font-bold text-toss-blue">Day {String(listDay).padStart(2, '0')}</span>
                </div>

                <div className="mt-3 flex gap-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="listbox" aria-label="단어 리스트 Day 선택">
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
                          'flex size-8 shrink-0 items-center justify-center rounded-lg text-xs transition-colors motion-reduce:transition-none sm:size-9',
                          selected
                            ? 'bg-toss-blue font-extrabold text-white shadow-sm'
                            : 'font-semibold text-toss-muted hover:bg-toss-bg hover:text-toss-text',
                        )}
                        onClick={() => void selectListDay(day)}
                      >
                        {day}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-10 pt-3 sm:px-6">
                {loadingDay === listDay && words === undefined ? (
                  <p className="py-12 text-center text-sm text-toss-muted">Day {listDay} 단어를 불러오고 있어요.</p>
                ) : null}
                {loadError && words === undefined ? (
                  <div className="py-12 text-center">
                    <p className="text-sm text-toss-error">{loadError}</p>
                    <button
                      type="button"
                      className="mt-3 rounded-toss-button bg-toss-ice-blue px-4 py-2 text-sm font-semibold text-toss-blue"
                      onClick={() => void selectListDay(listDay)}
                    >
                      다시 시도
                    </button>
                  </div>
                ) : null}
                {words ? (
                  <ol className="space-y-2">
                    {words.map((word, index) => (
                      <li key={word.id} className="rounded-2xl border border-toss-border bg-toss-bg/70 px-4 py-3">
                        <div className="flex items-start gap-3">
                          <span className="mt-0.5 w-6 shrink-0 text-right text-xs font-semibold text-toss-muted">{index + 1}</span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                              <p className="font-extrabold text-toss-text">{word.word}</p>
                              <p className="text-sm font-semibold text-toss-blue">{word.meaning}</p>
                            </div>
                            <p className="mt-1.5 text-sm leading-6 text-toss-muted">{word.exampleEn}</p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : null}
              </div>
            </motion.section>
          </div>
        </>
      ) : null}
    </AnimatePresence>
  )
}
