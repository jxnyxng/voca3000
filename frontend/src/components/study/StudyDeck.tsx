import { ChevronLeft, ChevronRight, RotateCcw, Shuffle } from 'lucide-react'
import { AnimatePresence, useReducedMotion } from 'motion/react'
import { useId, useMemo, useRef, useState } from 'react'
import { EmptyState } from '../common/EmptyState'
import { SegmentedControl } from '../common/SegmentedControl'
import type { UserProgressRecord } from '../../types/progress'
import type { WordItem } from '../../types/word'
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
  onToggleMastered: (wordId: string) => Promise<boolean>
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

export function StudyDeck({
  words,
  progressByWordId,
  completedStudy,
  onToggleMastered,
  onStudyComplete,
  onOpenWordList,
}: StudyDeckProps) {
  const incorrectTooltipId = `${useId()}-incorrect-filter-tooltip`
  const targetLanguageCode = words[0]?.language === 'ja' ? 'Jp' : 'En'
  const targetLanguageName = words[0]?.language === 'ja' ? '일본어' : '영어'
  const targetLanguageShort = words[0]?.language === 'ja' ? '일' : '영'
  const [currentIndex, setCurrentIndex] = useState(0)
  const [cardTransitionKey, setCardTransitionKey] = useState(0)
  const [orderedWords, setOrderedWords] = useState(() => shuffledCopy(words))
  const [incorrectOnly, setIncorrectOnly] = useState(false)
  const [learningOnly, setLearningOnly] = useState(false)
  const [hideDirection, setHideDirection] = useState<HideDirection>('korean')
  const [revealedWordId, setRevealedWordId] = useState<string | null>(null)
  const [visitedWordIds, setVisitedWordIds] = useState(
    () => new Set(orderedWords[0] === undefined ? [] : [orderedWords[0].id]),
  )
  const [completionError, setCompletionError] = useState<string | null>(null)
  const [pendingMastery, setPendingMastery] = useState<{ wordId: string; value: boolean } | null>(null)
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
  const isIncorrectFilterActive = incorrectOnly && incorrectWordIds.size > 0
  const learningWordCount = words.filter(
    ({ id }) => !(progressByWordId.get(id)?.isMastered ?? false),
  ).length
  const isLearningFilterActive = learningOnly && learningWordCount > 0
  const displayedWords = orderedWords.filter(({ id }) =>
    (!isIncorrectFilterActive || incorrectWordIds.has(id))
      && (!isLearningFilterActive || !(progressByWordId.get(id)?.isMastered ?? false)),
  )
  const displayedIndex = currentIndex < displayedWords.length ? currentIndex : 0
  const currentWord = displayedWords[displayedIndex]
  const revealed = currentWord !== undefined && revealedWordId === currentWord.id
  const relatedQuizDirection = hideDirection === 'english'
    ? `한→${targetLanguageShort}`
    : `${targetLanguageShort}→한`

  const toggleCurrentMastery = async (): Promise<void> => {
    if (currentWord === undefined || pendingMastery !== null) return
    const nextMastered = !(progressByWordId.get(currentWord.id)?.isMastered ?? false)
    setPendingMastery({ wordId: currentWord.id, value: nextMastered })
    setMasteryError(null)
    try {
      await onToggleMastered(currentWord.id)
    } catch {
      setMasteryError('암기 상태를 저장하지 못했어요. 다시 시도해 주세요.')
    } finally {
      setPendingMastery(null)
    }
  }

  const saveCompletion = async (): Promise<void> => {
    if (completedStudy || completionLockedRef.current) return
    completionLockedRef.current = true
    setCompletionError(null)
    try {
      await onStudyComplete()
    } catch {
      setCompletionError('학습 완료 상태를 저장하지 못했어요. 다시 시도해 주세요.')
      completionLockedRef.current = false
    }
  }

  const goTo = (nextIndex: number): void => {
    if (nextIndex < 0 || nextIndex >= displayedWords.length || nextIndex === displayedIndex) return
    const nextWord = displayedWords[nextIndex]
    if (nextWord === undefined) return
    const nextVisitedWordIds = new Set(visitedWordIds)
    nextVisitedWordIds.add(nextWord.id)
    setCurrentIndex(nextIndex)
    setCardTransitionKey((key) => key + 1)
    setRevealedWordId(null)
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
    setCurrentIndex(0)
    setRevealedWordId(null)
  }

  const shuffleTransition = useShuffleTransition(shuffleCards, shouldReduceMotion ?? false)

  return (
    <section
      className="flex min-h-[calc(85dvh-12.75rem)] touch-pan-y flex-col rounded-toss-card sm:min-h-[calc(85dvh-11.9rem)] lg:min-h-[calc(85dvh-10.2rem)]"
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
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-1 sm:mb-4">
        <button
          type="button"
          className="inline-flex min-h-[1.875rem] items-center gap-1.5 rounded-toss-button border border-toss-border bg-toss-surface px-2.5 text-[0.6875rem] font-semibold text-toss-text shadow-sm transition-colors hover:bg-toss-bg motion-reduce:transition-none"
          disabled={shuffleTransition.isShuffling}
          aria-busy={shuffleTransition.isShuffling}
          onClick={shuffleTransition.start}
        >
          <Shuffle className="size-3" aria-hidden="true" />
          카드 섞기
        </button>
        <div className="ml-auto flex flex-wrap items-center justify-end gap-x-2.5 gap-y-1">
          <div
            className="group relative"
            tabIndex={incorrectWordIds.size === 0 ? 0 : undefined}
            aria-describedby={incorrectWordIds.size === 0 ? incorrectTooltipId : undefined}
          >
            <label className={cn(
              'inline-flex min-h-7 items-center gap-1 text-[0.6875rem] font-semibold',
              incorrectWordIds.size === 0 ? 'cursor-not-allowed text-toss-muted' : 'cursor-pointer text-toss-text',
            )}>
              <input
                type="checkbox"
                className="size-3.5 accent-toss-blue"
                checked={isIncorrectFilterActive}
                disabled={incorrectWordIds.size === 0}
                onChange={(event) => {
                  setIncorrectOnly(event.target.checked)
                  setCurrentIndex(0)
                  setRevealedWordId(null)
                }}
              />
              오답만 보기
            </label>
            {incorrectWordIds.size === 0 ? (
              <p
                id={incorrectTooltipId}
                role="tooltip"
                className="invisible absolute right-0 top-full z-20 mt-1.5 w-max max-w-[min(17rem,calc(100vw-2rem))] rounded-lg bg-toss-text px-2.5 py-1.5 text-[0.6875rem] font-medium leading-4 text-toss-surface opacity-0 shadow-lg transition-opacity group-hover:visible group-hover:opacity-100 group-focus:visible group-focus:opacity-100 motion-reduce:transition-none"
              >
                아직 {relatedQuizDirection} 오답이 없어요. {relatedQuizDirection} 테스트를 먼저 풀어보세요.
              </p>
            ) : null}
          </div>
          <label className={cn(
            'inline-flex min-h-7 items-center gap-1 text-[0.6875rem] font-semibold',
            learningWordCount === 0 ? 'cursor-not-allowed text-toss-muted' : 'cursor-pointer text-toss-text',
          )}>
            <input
              type="checkbox"
              className="size-3.5 accent-toss-blue"
              checked={isLearningFilterActive}
              disabled={learningWordCount === 0}
              onChange={(event) => {
                setLearningOnly(event.target.checked)
                setCurrentIndex(0)
                setRevealedWordId(null)
              }}
            />
            외운 단어 제외
          </label>
          <SegmentedControl
            value={hideDirection}
            ariaLabel="가림 방향 선택"
            options={[
              { value: 'korean', label: 'Ko', ariaLabel: '한국어 가리기' },
              { value: 'english', label: targetLanguageCode, ariaLabel: `${targetLanguageName} 가리기` },
            ]}
            onChange={(direction) => {
              setHideDirection(direction)
              setCurrentIndex(0)
              setRevealedWordId(null)
            }}
          />
        </div>
      </div>

      {currentWord === undefined ? (
        <EmptyState title="조건에 맞는 단어가 없어요" description="필터 하나를 해제해서 다른 단어를 확인해 보세요." />
      ) : (
        <>
          <div className="relative flex min-h-0 flex-1 overflow-hidden rounded-toss-card">
            <AnimatePresence mode="wait" initial={false}>
              <FlashCard
                key={cardTransitionKey}
                word={currentWord}
                hideDirection={hideDirection}
                revealed={revealed}
                mastered={progressByWordId.get(currentWord.id)?.isMastered ?? false}
                position={displayedIndex + 1}
                total={displayedWords.length}
                onReveal={() => setRevealedWordId(currentWord.id)}
                onToggleMastered={onToggleMastered}
                showMasteryButton={false}
              />
            </AnimatePresence>
            <ShuffleCurtain
              phase={shuffleTransition.phase}
              reduceMotion={shouldReduceMotion ?? false}
              onAnimationComplete={shuffleTransition.handleAnimationComplete}
            />
          </div>

          <div className="mt-4 grid grid-cols-[minmax(0,1fr)_3rem_minmax(0,1fr)] items-center gap-3">
            <button
              type="button"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-toss-button border border-toss-border bg-toss-surface font-semibold text-toss-text disabled:cursor-not-allowed disabled:opacity-40"
              disabled={displayedIndex === 0}
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
            />
            <button
              type="button"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-toss-button bg-toss-blue font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
              disabled={displayedIndex === displayedWords.length - 1}
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
