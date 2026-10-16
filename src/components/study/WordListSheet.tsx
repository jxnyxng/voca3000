import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Check } from 'lucide-react'
import { AnimatePresence, motion, useDragControls, useReducedMotion } from 'motion/react'
import { toggleMastered, type VocaDatabase } from '../../db'
import type { DayIndexItem, WordItem } from '../../types/word'
import { cn } from '../../utils/cn'

export interface WordListSheetProps {
  open: boolean
  days: readonly DayIndexItem[]
  initialDay: number
  initialWords: readonly WordItem[]
  database: VocaDatabase
  loadWords: (day: number) => Promise<WordItem[]>
  onClose: () => void
}

export function WordListSheet({
  open,
  days,
  initialDay,
  initialWords,
  database,
  loadWords,
  onClose,
}: WordListSheetProps) {
  const shouldReduceMotion = useReducedMotion()
  const dragControls = useDragControls()
  const dayIndicatorId = useId()
  const [listDay, setListDay] = useState(initialDay)
  const [wordsByDay, setWordsByDay] = useState(
    () => new Map<number, readonly WordItem[]>([[initialDay, initialWords]]),
  )
  const [loadingDay, setLoadingDay] = useState<number | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [masteryError, setMasteryError] = useState<string | null>(null)
  const [pendingMasteryIds, setPendingMasteryIds] = useState<ReadonlySet<string>>(() => new Set())
  const selectedDayRef = useRef<HTMLButtonElement | null>(null)
  const requestedDayRef = useRef(initialDay)

  const closeSheet = useCallback((): void => {
    requestedDayRef.current = initialDay
    setListDay(initialDay)
    setWordsByDay((current) => new Map(current).set(initialDay, initialWords))
    setLoadError(null)
    setMasteryError(null)
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
  const visibleWordIds = useMemo(() => words?.map(({ id }) => id) ?? [], [words])
  const visibleWordIdsKey = visibleWordIds.join('\u0000')
  const visibleProgress = useLiveQuery(
    () => database.progress.bulkGet(visibleWordIds),
    [database, visibleWordIdsKey],
    [],
  )
  const masteredWordIds = useMemo(
    () => new Set(visibleProgress.flatMap((record) => record?.isMastered ? [record.wordId] : [])),
    [visibleProgress],
  )

  const toggleListMastery = async (wordId: string): Promise<void> => {
    if (pendingMasteryIds.has(wordId)) return
    setMasteryError(null)
    setPendingMasteryIds((current) => new Set(current).add(wordId))
    try {
      await toggleMastered(wordId, database)
    } catch {
      setMasteryError('암기 상태를 저장하지 못했어요. 다시 시도해 주세요.')
    } finally {
      setPendingMasteryIds((current) => {
        const next = new Set(current)
        next.delete(wordId)
        return next
      })
    }
  }

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="단어 리스트 닫기"
            className="fixed inset-0 z-40 cursor-default bg-slate-900/10 backdrop-blur-[1px]"
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
              className="pointer-events-auto flex h-[calc(100dvh-2.125rem)] min-h-0 flex-col overflow-hidden rounded-t-[1.75rem] border border-b-0 border-toss-border bg-toss-surface shadow-2xl sm:h-[calc(100dvh-2.5rem)] lg:h-[calc(100dvh-4rem)]"
              initial={shouldReduceMotion ? { opacity: 0 } : { y: '100%', opacity: 0.8 }}
              animate={{ y: 0, opacity: 1 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { y: '100%', opacity: 0.8 }}
              transition={shouldReduceMotion ? { duration: 0.01 } : { type: 'spring', stiffness: 330, damping: 34, mass: 0.9 }}
              drag={shouldReduceMotion ? false : 'y'}
              dragControls={dragControls}
              dragListener={false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.28 }}
              onDragStart={() => window.getSelection()?.removeAllRanges()}
              onDragEnd={(_event, info) => {
                if (info.offset.y > 120 || info.velocity.y > 700) closeSheet()
              }}
            >
              <div
                role="button"
                tabIndex={0}
                className="group flex h-9 shrink-0 cursor-grab select-none touch-none items-center justify-center active:cursor-grabbing [-webkit-user-drag:none]"
                aria-label="단어 리스트 닫기"
                draggable={false}
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

              <div className="shrink-0 border-b border-toss-border px-4 pb-2 sm:px-6">
                <div className="flex items-center gap-2">
                  <span className="shrink-0 text-sm font-bold text-toss-blue">Day {String(listDay).padStart(2, '0')}</span>
                  <h2 id="word-list-title" className="text-base font-extrabold text-toss-text">단어 리스트</h2>
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
                          'relative flex size-8 shrink-0 items-center justify-center rounded-lg text-xs transition-colors motion-reduce:transition-none sm:size-9',
                          selected
                            ? 'font-extrabold text-toss-blue'
                            : 'font-semibold text-toss-muted hover:text-toss-text',
                        )}
                        onClick={() => void selectListDay(day)}
                      >
                        <span className="relative">
                          {day}
                          {selected ? (
                            <motion.span
                              data-word-list-day-indicator
                              layoutId={`${dayIndicatorId}-word-list-day`}
                              className="absolute -bottom-1.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-toss-blue"
                            />
                          ) : null}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-10 pt-3 sm:px-6">
                {masteryError ? <p role="alert" className="mb-2 text-center text-xs text-toss-error">{masteryError}</p> : null}
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
                      <li key={word.id} className="rounded-2xl border border-toss-border bg-toss-bg/70 px-3 py-3 sm:px-4">
                        <div className="grid min-w-0 gap-x-5 gap-y-1.5 sm:grid-cols-[minmax(0,1fr)_auto]">
                          <div className="min-w-0">
                            <div className="flex min-w-0 items-baseline gap-2">
                              <span className="inline-flex min-w-5 shrink-0 items-center justify-center rounded-md bg-toss-surface px-1 py-0.5 text-[0.625rem] font-bold text-toss-muted shadow-sm">
                                {index + 1}
                              </span>
                              <p className="min-w-0 font-extrabold text-toss-text">{word.word}</p>
                            </div>
                            <p className="mt-0.5 pl-7 text-xs text-toss-muted/75">({word.pronunciation})</p>
                            <p className="mt-2 text-sm leading-6 text-toss-muted">{word.exampleEn}</p>
                            {word.examplePronunciation ? (
                              <p className="mt-0.5 text-xs leading-5 text-toss-muted/70">({word.examplePronunciation})</p>
                            ) : null}
                          </div>
                          <div className="flex min-w-fit flex-col items-end justify-end gap-2 sm:row-start-1">
                            <p className="text-right text-sm font-semibold text-toss-blue">{word.meaning}</p>
                            <button
                              type="button"
                              aria-pressed={masteredWordIds.has(word.id)}
                              disabled={pendingMasteryIds.has(word.id)}
                              className={cn(
                                'inline-flex h-7 shrink-0 items-center gap-1 rounded-full px-2.5 text-[0.6875rem] font-bold transition-colors disabled:opacity-50',
                                masteredWordIds.has(word.id)
                                  ? 'bg-toss-success/15 text-toss-success'
                                  : 'bg-toss-surface text-toss-muted shadow-sm ring-1 ring-inset ring-toss-border hover:text-toss-text',
                              )}
                              onClick={() => void toggleListMastery(word.id)}
                            >
                              <Check className="size-3" aria-hidden="true" />
                              {masteredWordIds.has(word.id) ? '외웠어요' : '외우는 중'}
                            </button>
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
