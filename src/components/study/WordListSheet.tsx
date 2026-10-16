import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import type {
  PointerEvent as ReactPointerEvent,
  TouchEvent as ReactTouchEvent,
  WheelEvent as ReactWheelEvent,
} from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Search } from 'lucide-react'
import { AnimatePresence, motion, useDragControls, useReducedMotion } from 'motion/react'
import { toggleMastered, type VocaDatabase } from '../../db'
import type { DayIndexItem, WordItem } from '../../types/word'
import { cn } from '../../utils/cn'
import { WordListRow } from './WordListRow'

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
  const [searchQuery, setSearchQuery] = useState('')
  const searchActive = searchQuery.trim().length > 0
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [expandedExampleIds, setExpandedExampleIds] = useState<ReadonlySet<string>>(() => new Set())
  const [listPullClosing, setListPullClosing] = useState(false)
  const [pendingMasteryIds, setPendingMasteryIds] = useState<ReadonlySet<string>>(() => new Set())
  const selectedDayRef = useRef<HTMLButtonElement | null>(null)
  const requestedDayRef = useRef(initialDay)
  const wheelPullRef = useRef({ distance: 0, lastAt: 0 })
  const touchPullRef = useRef<{ startY: number, startedAtTop: boolean } | null>(null)
  const listPullClosingRef = useRef(false)
  const loadWordsRef = useRef(loadWords)
  const searchRequestedDaysRef = useRef<Set<number>>(new Set())
  const searchSessionRef = useRef(0)

  useEffect(() => {
    loadWordsRef.current = loadWords
  }, [loadWords])

  const closeSheet = useCallback((): void => {
    requestedDayRef.current = initialDay
    setListDay(initialDay)
    setWordsByDay((current) => new Map(current).set(initialDay, initialWords))
    setLoadError(null)
    setMasteryError(null)
    setSearchQuery('')
    setSearchLoading(false)
    setSearchError(null)
    setExpandedExampleIds(new Set())
    searchRequestedDaysRef.current.clear()
    searchSessionRef.current += 1
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

  useEffect(() => {
    if (!open || !searchActive) return

    const missingDays = days
      .filter(({ day }) => !wordsByDay.has(day) && !searchRequestedDaysRef.current.has(day))
      .map(({ day }) => day)
    if (missingDays.length === 0) return

    const searchSession = searchSessionRef.current
    missingDays.forEach((day) => searchRequestedDaysRef.current.add(day))
    void Promise.allSettled(missingDays.map(async (day) => ({ day, words: await loadWordsRef.current(day) })))
      .then((results) => {
        const loadedResults = results.flatMap((result) => result.status === 'fulfilled' ? [result.value] : [])
        setWordsByDay((current) => {
          const next = new Map(current)
          loadedResults.forEach(({ day, words: loadedWords }) => next.set(day, loadedWords))
          return next
        })
        if (searchSessionRef.current === searchSession && results.some((result) => result.status === 'rejected')) {
          setSearchError('일부 Day를 불러오지 못했어요. 불러온 단어에서 검색했어요.')
        }
      })
      .finally(() => {
        if (searchSessionRef.current === searchSession) setSearchLoading(false)
      })
  }, [days, open, searchActive, wordsByDay])

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
  const displayedWords = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase()
    if (!normalizedQuery) {
      return (words ?? []).map((word, index) => ({ word, day: listDay, position: index + 1 }))
    }
    return days.flatMap(({ day }) => (wordsByDay.get(day) ?? []).flatMap((word, index) => (
      [word.word, word.meaning, word.pronunciation].some((value) => value.toLocaleLowerCase().includes(normalizedQuery))
        ? [{ word, day, position: index + 1 }]
        : []
    )))
  }, [days, listDay, searchQuery, words, wordsByDay])
  const visibleWordIds = useMemo(() => displayedWords.map(({ word }) => word.id), [displayedWords])
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

  const toggleExample = (wordId: string): void => {
    setExpandedExampleIds((current) => {
      const next = new Set(current)
      if (next.has(wordId)) next.delete(wordId)
      else next.add(wordId)
      return next
    })
  }

  const startSheetDrag = (event: ReactPointerEvent): void => {
    if (!shouldReduceMotion) dragControls.start(event)
  }

  const closeFromListPull = (): void => {
    if (listPullClosingRef.current) return
    listPullClosingRef.current = true
    setListPullClosing(true)
    window.requestAnimationFrame(closeSheet)
  }

  const handleListWheel = (event: ReactWheelEvent<HTMLDivElement>): void => {
    if (window.innerWidth >= 1024) return
    if (event.currentTarget.scrollTop > 0 || event.deltaY >= 0) {
      wheelPullRef.current = { distance: 0, lastAt: 0 }
      return
    }

    const now = Date.now()
    const previous = wheelPullRef.current
    const distance = now - previous.lastAt > 350 ? -event.deltaY : previous.distance - event.deltaY
    wheelPullRef.current = { distance, lastAt: now }
    if (distance >= 120) {
      wheelPullRef.current = { distance: 0, lastAt: 0 }
      closeFromListPull()
    }
  }

  const handleListTouchStart = (event: ReactTouchEvent<HTMLDivElement>): void => {
    if (window.innerWidth >= 1024) return
    const touch = event.touches[0]
    if (!touch) return
    touchPullRef.current = {
      startY: touch.clientY,
      startedAtTop: event.currentTarget.scrollTop === 0,
    }
  }

  const handleListTouchMove = (event: ReactTouchEvent<HTMLDivElement>): void => {
    const pull = touchPullRef.current
    const touch = event.touches[0]
    if (!pull || !touch || !pull.startedAtTop) return
    if (touch.clientY - pull.startY >= 90) {
      touchPullRef.current = null
      closeFromListPull()
    }
  }

  return (
    <AnimatePresence onExitComplete={() => {
      setListPullClosing(false)
      listPullClosingRef.current = false
    }}>
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
              data-list-pull-closing={listPullClosing || undefined}
              className="pointer-events-auto flex h-[calc(100dvh-2.125rem)] min-h-0 flex-col overflow-hidden rounded-t-[1.75rem] border border-b-0 border-toss-border bg-toss-surface shadow-2xl sm:h-[calc(100dvh-2.5rem)] lg:h-[calc(100dvh-4rem)]"
              initial={shouldReduceMotion ? { opacity: 0 } : { y: '100%', opacity: 0.8 }}
              animate={{ y: 0, opacity: 1 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { y: '100%', opacity: 0.8 }}
              transition={shouldReduceMotion
                ? { duration: 0.01 }
                : listPullClosing
                  ? { duration: 0.48, ease: [0.22, 1, 0.36, 1] }
                  : { type: 'spring', stiffness: 330, damping: 34, mass: 0.9 }}
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
                data-word-list-drag-header
                className="shrink-0 cursor-grab select-none touch-pan-x border-b border-toss-border active:cursor-grabbing [-webkit-user-drag:none]"
                onPointerDown={startSheetDrag}
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
                      closeSheet()
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
                        onChange={(event) => {
                          const nextQuery = event.target.value
                          const nextSearchActive = nextQuery.trim().length > 0
                          setSearchQuery(nextQuery)
                          setSearchError(null)
                          if (!nextSearchActive) {
                            searchRequestedDaysRef.current.clear()
                            searchSessionRef.current += 1
                          }
                          setSearchLoading((current) => nextSearchActive
                            ? (searchActive ? current : days.some(({ day }) => !wordsByDay.has(day)))
                            : false)
                        }}
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
                          onClick={() => void selectListDay(day)}
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

              <div
                data-word-list-scroll
                className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-10 pt-3 sm:px-6"
                onWheel={handleListWheel}
                onTouchStart={handleListTouchStart}
                onTouchMove={handleListTouchMove}
                onTouchEnd={() => { touchPullRef.current = null }}
                onTouchCancel={() => { touchPullRef.current = null }}
              >
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
                {searchLoading ? (
                  <p className="mb-2 text-center text-xs font-medium text-toss-muted">전체 Day에서 검색하고 있어요.</p>
                ) : null}
                {searchActive && searchError ? <p role="status" className="mb-2 text-center text-xs text-toss-error">{searchError}</p> : null}
                {displayedWords.length > 0 ? (
                  <ol className="space-y-2">
                    {displayedWords.map(({ word, day, position }) => (
                      <WordListRow
                        key={word.id}
                        word={word}
                        day={day}
                        position={position}
                        showDay={searchActive}
                        mastered={masteredWordIds.has(word.id)}
                        masteryPending={pendingMasteryIds.has(word.id)}
                        exampleExpanded={expandedExampleIds.has(word.id)}
                        onToggleMastery={() => void toggleListMastery(word.id)}
                        onToggleExample={() => toggleExample(word.id)}
                      />
                    ))}
                  </ol>
                ) : null}
                {!searchLoading && (searchActive || words !== undefined) && displayedWords.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-sm font-semibold text-toss-text">검색 결과가 없어요.</p>
                    <p className="mt-1 text-xs text-toss-muted">다른 단어나 뜻으로 검색해 보세요.</p>
                  </div>
                ) : null}
              </div>
            </motion.section>
          </div>
        </>
      ) : null}
    </AnimatePresence>
  )
}
