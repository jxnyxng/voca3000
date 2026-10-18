import { useCallback, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { VocaDatabase } from '../../db'
import type { DayIndexItem, WordItem } from '../../types/word'
import { WordListHeader } from './WordListHeader'
import { WordListRow } from './WordListRow'
import { useWordListData } from './useWordListData'
import { useWordListMastery } from './useWordListMastery'
import { useWordListSheetBehavior } from './useWordListSheetBehavior'

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
  const [expandedExampleIds, setExpandedExampleIds] = useState<ReadonlySet<string>>(() => new Set())
  const {
    listDay,
    words,
    loadingDay,
    loadError,
    searchQuery,
    searchActive,
    searchLoading,
    searchError,
    displayedWords,
    selectListDay,
    updateSearchQuery,
    reset: resetWordListData,
  } = useWordListData({ open, days, initialDay, initialWords, loadWords })
  const visibleWords = useMemo(() => displayedWords.map(({ word }) => word), [displayedWords])
  const {
    masteryError,
    pendingMasteryIds,
    masteredWordIds,
    toggleListMastery,
    resetMasteryError,
  } = useWordListMastery(visibleWords, database)

  const closeSheet = useCallback((): void => {
    resetWordListData()
    resetMasteryError()
    setExpandedExampleIds(new Set())
    onClose()
  }, [onClose, resetMasteryError, resetWordListData])

  const {
    shouldReduceMotion,
    dragControls,
    listPullClosing,
    startSheetDrag,
    handleListWheel,
    handleListTouchStart,
    handleListTouchMove,
    finishListPull,
    finishExit,
  } = useWordListSheetBehavior(open, closeSheet)

  const toggleExample = (wordId: string): void => {
    setExpandedExampleIds((current) => {
      const next = new Set(current)
      if (next.has(wordId)) next.delete(wordId)
      else next.add(wordId)
      return next
    })
  }

  return (
    <AnimatePresence onExitComplete={finishExit}>
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
              <WordListHeader
                open={open}
                days={days}
                listDay={listDay}
                searchQuery={searchQuery}
                shouldReduceMotion={shouldReduceMotion}
                onClose={closeSheet}
                onSelectDay={(day) => void selectListDay(day)}
                onSearchQueryChange={updateSearchQuery}
                onPointerDown={startSheetDrag}
              />

              <div
                data-word-list-scroll
                className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-10 pt-3 sm:px-6"
                onWheel={handleListWheel}
                onTouchStart={handleListTouchStart}
                onTouchMove={handleListTouchMove}
                onTouchEnd={finishListPull}
                onTouchCancel={finishListPull}
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
