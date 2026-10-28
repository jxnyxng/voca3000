import { ChevronLeft, ChevronRight, RotateCcw, Shuffle } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { EmptyState } from '../common/EmptyState'
import { SlidingPillIndicator } from '../common/SlidingPillIndicator'
import type { UserProgressRecord } from '../../types/progress'
import type { QuizMode, WordItem } from '../../types/word'
import { cn } from '../../utils/cn'
import { shuffledCopy as shuffleItems } from '../../utils/shuffle'
import { FlashCard, type HideDirection } from './FlashCard'
import { MasteryToggleButton } from './MasteryToggleButton'
import { ShuffleCurtain } from './ShuffleCurtain'
import { useShuffleTransition } from './useShuffleTransition'

export interface StudyDeckProps {
  words: readonly WordItem[]
  progressByWordId: ReadonlyMap<string, UserProgressRecord>
  completedStudy: boolean
  direction?: QuizMode
  onToggleMastered: (wordId: string) => Promise<boolean>
  onToggleFavorite?: (wordId: string) => Promise<boolean>
  onStudyComplete: () => Promise<void>
  onOpenWordList?: () => void
}

function shuffledCopy(words: readonly WordItem[]): WordItem[] {
  const shuffled = shuffleItems(words)
  if (shuffled.length > 1 && shuffled.every((word, index) => word.id === words[index]?.id)) {
    shuffled.push(shuffled.shift()!)
  }
  return shuffled
}

const WORD_FILTERS = [
  { value: 'all', label: '전체' },
  { value: 'learning', label: '외우는중' },
  { value: 'incorrect', label: '오답단어' },
  { value: 'favorite', label: '즐겨찾기' },
] as const

export function StudyDeck({
  words,
  progressByWordId,
  completedStudy,
  direction = 'ko-to-en',
  onToggleMastered,
  onToggleFavorite,
  onStudyComplete,
  onOpenWordList,
}: StudyDeckProps) {
  const filterId = useId()
  const hideDirection: HideDirection = direction === 'ko-to-en' ? 'english' : 'korean'
  const [selection, setSelection] = useState<{ direction: QuizMode; index: number }>({ direction, index: 0 })
  const [cardTransitionKey, setCardTransitionKey] = useState(0)
  const [orderedWords, setOrderedWords] = useState(() => shuffledCopy(words))
  const [wordFilter, setWordFilter] = useState<'all' | 'learning' | 'incorrect' | 'favorite'>('all')
  const [revealedCardId, setRevealedCardId] = useState<string | null>(null)
  const [visitedWordIds, setVisitedWordIds] = useState(
    () => new Set(orderedWords[0] === undefined ? [] : [orderedWords[0].id]),
  )
  const [completionError, setCompletionError] = useState<string | null>(null)
  const [pendingMastery, setPendingMastery] = useState<{ wordId: string; value: boolean } | null>(null)
  const [masteryTransition, setMasteryTransition] = useState<{
    wordId: string
    saved: boolean
    animationDone: boolean
  } | null>(null)
  const [masteryError, setMasteryError] = useState<string | null>(null)
  const completionLockedRef = useRef(false)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const shouldReduceMotion = useReducedMotion()

  const incorrectWordIds = useMemo(
    () => new Set(
      [...progressByWordId.values()]
        .filter((record) => hideDirection === 'english'
          ? record.lastResultKoToEn === 'incorrect'
          : record.lastResultEnToKo === 'incorrect')
        .map(({ wordId }) => wordId),
    ),
    [hideDirection, progressByWordId],
  )
  const isLearningFilterActive = wordFilter === 'learning'
  const displayedWords = orderedWords.filter(({ id }) =>
    wordFilter === 'all' || (wordFilter === 'learning' && (id === masteryTransition?.wordId || !(progressByWordId.get(id)?.isMastered ?? false)))
      || (wordFilter === 'incorrect' && incorrectWordIds.has(id))
      || (wordFilter === 'favorite' && (progressByWordId.get(id)?.isFavorite ?? false)),
  )
  const currentIndex = selection.direction === direction ? selection.index : 0
  const displayedIndex = currentIndex < displayedWords.length ? currentIndex : 0
  const currentWord = displayedWords[displayedIndex]
  const revealed = currentWord !== undefined && revealedCardId === `${currentWord.id}:${direction}`

  const toggleCurrentMastery = async (): Promise<void> => {
    if (currentWord === undefined || pendingMastery !== null || masteryTransition !== null) return
    const nextMastered = !(progressByWordId.get(currentWord.id)?.isMastered ?? false)
    if (isLearningFilterActive && nextMastered) {
      setMasteryTransition({ wordId: currentWord.id, saved: false, animationDone: false })
    }
    setPendingMastery({ wordId: currentWord.id, value: nextMastered })
    setMasteryError(null)
    try {
      await onToggleMastered(currentWord.id)
      setMasteryTransition((transition) => transition?.wordId === currentWord.id
        ? { ...transition, saved: true }
        : transition)
    } catch {
      setMasteryError('암기 상태를 저장하지 못했어요. 다시 시도해 주세요.')
      setMasteryTransition(null)
    } finally {
      setPendingMastery(null)
    }
  }

  const saveCompletion = useCallback(async (): Promise<void> => {
    if (completedStudy || completionLockedRef.current) return
    completionLockedRef.current = true
    setCompletionError(null)
    try {
      await onStudyComplete()
    } catch {
      setCompletionError('학습 완료 상태를 저장하지 못했어요. 다시 시도해 주세요.')
      completionLockedRef.current = false
    }
  }, [completedStudy, onStudyComplete])

  useEffect(() => {
    if (!masteryTransition?.saved || !masteryTransition.animationDone
      || !progressByWordId.get(masteryTransition.wordId)?.isMastered) return

    const remainingWords = displayedWords.filter(({ id }) => id !== masteryTransition.wordId)
    const nextWord = remainingWords[Math.min(displayedIndex, remainingWords.length - 1)]
    if (nextWord !== undefined) {
      const nextVisitedWordIds = new Set(visitedWordIds).add(nextWord.id)
      setVisitedWordIds(nextVisitedWordIds)
      if (nextVisitedWordIds.size === words.length) void saveCompletion()
    }
    setRevealedCardId(null)
    setCardTransitionKey((key) => key + 1)
    setMasteryTransition(null)
  }, [masteryTransition, progressByWordId, displayedWords, displayedIndex, visitedWordIds, words.length, saveCompletion])

  const goTo = (nextIndex: number): void => {
    if (masteryTransition !== null) return
    if (nextIndex < 0 || nextIndex >= displayedWords.length || nextIndex === displayedIndex) return
    const nextWord = displayedWords[nextIndex]
    if (nextWord === undefined) return
    const nextVisitedWordIds = new Set(visitedWordIds)
    nextVisitedWordIds.add(nextWord.id)
    setSelection({ direction, index: nextIndex })
    setCardTransitionKey((key) => key + 1)
    setRevealedCardId(null)
    setVisitedWordIds(nextVisitedWordIds)
    if (nextVisitedWordIds.size === words.length) void saveCompletion()
  }

  const shuffleCards = (): void => {
    setOrderedWords((current) => {
      const nextOrder = shuffledCopy(current)
      const firstWord = nextOrder[0]
      if (firstWord !== undefined) {
        setVisitedWordIds((visited) => new Set(visited).add(firstWord.id))
      }
      return nextOrder
    })
    setSelection({ direction, index: 0 })
    setRevealedCardId(null)
  }

  const shuffleTransition = useShuffleTransition(shuffleCards, shouldReduceMotion ?? false)

  return (
    <section
      id={`${filterId}-panel`}
      className="flex min-h-[calc(100dvh-13rem)] touch-pan-y flex-col rounded-toss-card"
      aria-label="단어 학습 카드"
      tabIndex={0}
      onTouchStart={(event) => {
        if ((event.target as HTMLElement).closest('button, input, label')) {
          touchStartRef.current = null
          return
        }
        const touch = event.touches[0]
        touchStartRef.current = touch ? { x: touch.clientX, y: touch.clientY } : null
      }}
      onTouchEnd={(event) => {
        const start = touchStartRef.current
        touchStartRef.current = null
        const touch = event.changedTouches[0]
        if (!start || !touch) return
        const deltaX = touch.clientX - start.x
        const deltaY = touch.clientY - start.y
        if (Math.abs(deltaX) < 48 || Math.abs(deltaX) <= Math.abs(deltaY) * 1.2) return
        goTo(deltaX < 0 ? displayedIndex + 1 : displayedIndex - 1)
      }}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return
        if (event.key === 'ArrowLeft') {
          event.preventDefault()
          goTo(displayedIndex - 1)
        } else if (event.key === 'ArrowRight') {
          event.preventDefault()
          goTo(displayedIndex + 1)
        }
      }}
    >
      <div className="mx-auto mb-3 flex w-fit max-w-full items-center gap-1 overflow-x-auto rounded-full border border-toss-border bg-toss-surface p-1 shadow-toss" role="tablist" aria-label="단어 필터">
        {WORD_FILTERS.map(({ value, label }, index) => (
          <button
            key={value}
            id={`${filterId}-${value}-tab`}
            type="button"
            role="tab"
            aria-selected={wordFilter === value}
            aria-controls={`${filterId}-panel`}
            tabIndex={wordFilter === value ? 0 : -1}
            className={cn('relative isolate min-h-9 w-20 shrink-0 rounded-full px-2 text-xs font-bold transition-colors motion-reduce:transition-none', wordFilter === value ? 'text-white' : 'text-toss-muted hover:bg-toss-bg hover:text-toss-text')}
            onClick={() => {
              if (masteryTransition !== null) return
              setWordFilter(value)
              setSelection({ direction, index: 0 })
              setRevealedCardId(null)
            }}
            onKeyDown={(event) => {
              const nextIndex = event.key === 'ArrowRight' ? (index + 1) % WORD_FILTERS.length
                : event.key === 'ArrowLeft' ? (index - 1 + WORD_FILTERS.length) % WORD_FILTERS.length
                  : event.key === 'Home' ? 0 : event.key === 'End' ? WORD_FILTERS.length - 1 : -1
              if (nextIndex < 0) return
              event.preventDefault()
              const nextTab = document.getElementById(`${filterId}-${WORD_FILTERS[nextIndex].value}-tab`)
              nextTab?.click()
              nextTab?.focus()
            }}
          >
            {wordFilter === value ? <SlidingPillIndicator layoutId={`${filterId}-word-filter-indicator`} className="bg-toss-blue shadow-sm" /> : null}
            <span className="relative z-10">{label}</span>
          </button>
        ))}
      </div>
      {currentWord === undefined ? (
        <EmptyState title="조건에 맞는 단어가 없어요" description="다른 탭을 선택해서 단어를 확인해 보세요." />
      ) : (
        <>
          <div className="flex min-h-0 flex-1 flex-col-reverse gap-3 lg:flex-row lg:gap-2">
            <button
              type="button"
              className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-toss-button border border-toss-border bg-toss-surface text-sm font-semibold text-toss-text transition-colors hover:bg-toss-bg disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none lg:min-h-0 lg:w-10 lg:self-stretch lg:rounded-toss-card lg:text-toss-muted lg:shadow-toss lg:hover:text-toss-blue"
              aria-label="카드 섞기"
              title="카드 섞기"
              disabled={shuffleTransition.isShuffling || masteryTransition !== null}
              aria-busy={shuffleTransition.isShuffling}
              onClick={shuffleTransition.start}
            >
              <Shuffle className="size-5" aria-hidden="true" />
              <span className="lg:hidden">카드 섞기</span>
            </button>
            <motion.div
              className="relative flex min-w-0 flex-1 overflow-hidden rounded-toss-card"
              initial={shouldReduceMotion ? false : { y: 8 }}
              animate={{ y: 0 }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              <AnimatePresence mode="wait" initial={false}>
                <FlashCard
                  key={`${currentWord.id}-${direction}-${cardTransitionKey}`}
                  word={currentWord}
                  hideDirection={hideDirection}
                  revealed={revealed}
                  mastered={progressByWordId.get(currentWord.id)?.isMastered ?? false}
                  favorite={progressByWordId.get(currentWord.id)?.isFavorite ?? false}
                  onToggleFavorite={onToggleFavorite}
                  position={displayedIndex + 1}
                  total={displayedWords.length}
                  onReveal={() => setRevealedCardId(`${currentWord.id}:${direction}`)}
                  onToggleMastered={onToggleMastered}
                  showMasteryButton={false}
                />
              </AnimatePresence>
              <ShuffleCurtain
                phase={shuffleTransition.phase}
                reduceMotion={shouldReduceMotion ?? false}
                onAnimationComplete={shuffleTransition.handleAnimationComplete}
              />
            </motion.div>
          </div>

          <div className="mt-4 grid grid-cols-[minmax(0,1fr)_3rem_minmax(0,1fr)] items-center gap-3">
            <button
              type="button"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-toss-button border border-toss-border bg-toss-surface font-semibold text-toss-text disabled:cursor-not-allowed disabled:opacity-40"
              disabled={displayedIndex === 0 || masteryTransition !== null}
              onClick={() => goTo(displayedIndex - 1)}
            >
              <ChevronLeft className="size-5" aria-hidden="true" />
              이전
            </button>
            <MasteryToggleButton
              mastered={pendingMastery?.wordId === currentWord.id
                ? pendingMastery.value
                : (progressByWordId.get(currentWord.id)?.isMastered ?? false)}
              pending={pendingMastery?.wordId === currentWord.id}
              size="card"
              onToggle={() => void toggleCurrentMastery()}
              onMasteredAnimationComplete={() => {
                setMasteryTransition((transition) => transition?.wordId === currentWord.id
                  ? { ...transition, animationDone: true }
                  : transition)
              }}
            />
            <button
              type="button"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-toss-button bg-toss-blue font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
              disabled={displayedIndex === displayedWords.length - 1 || masteryTransition !== null}
              onClick={() => goTo(displayedIndex + 1)}
            >
              다음
              <ChevronRight className="size-5" aria-hidden="true" />
            </button>
          </div>
          {masteryError ? <p className="mt-3 text-center text-sm text-toss-error" role="alert">{masteryError}</p> : null}
          {onOpenWordList ? (
            <button
              type="button"
              className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-toss-button border border-toss-border bg-toss-surface text-sm font-semibold text-toss-text transition-colors hover:bg-toss-bg"
              onClick={onOpenWordList}
            >
              단어 리스트
            </button>
          ) : null}
        </>
      )}

      {completionError ? (
        <div className="mt-4 text-center" role="alert">
          <p className="text-sm text-toss-error">{completionError}</p>
          <button
            type="button"
            className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-toss-button border border-toss-border bg-toss-surface px-4 font-semibold"
            onClick={() => void saveCompletion()}
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            완료 저장 다시 시도
          </button>
        </div>
      ) : null}
    </section>
  )
}
