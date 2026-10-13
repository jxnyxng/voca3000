import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import { SlidingPillIndicator } from '../common/SlidingPillIndicator'
import type { UserProgressRecord } from '../../types/progress'
import type { WordItem } from '../../types/word'
import { cn } from '../../utils/cn'
import { FlashCard, type HideDirection } from './FlashCard'

export interface StudyDeckProps {
  words: readonly WordItem[]
  progressByWordId: ReadonlyMap<string, UserProgressRecord>
  completedStudy: boolean
  onToggleMastered: (wordId: string) => Promise<boolean>
  onStudyComplete: () => Promise<void>
}

export function StudyDeck({
  words,
  progressByWordId,
  completedStudy,
  onToggleMastered,
  onStudyComplete,
}: StudyDeckProps) {
  const hideDirectionIndicatorId = `${useId()}-hide-direction-indicator`
  const [currentIndex, setCurrentIndex] = useState(0)
  const [hideDirection, setHideDirection] = useState<HideDirection>('korean')
  const [revealed, setRevealed] = useState(false)
  const [visitedWordIds, setVisitedWordIds] = useState(
    () => new Set(words[0] === undefined ? [] : [words[0].id]),
  )
  const [completionError, setCompletionError] = useState<string | null>(null)
  const completionLockedRef = useRef(false)
  const currentWord = words[currentIndex]

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
    if (nextIndex < 0 || nextIndex >= words.length || nextIndex === currentIndex) return
    const nextWord = words[nextIndex]
    if (nextWord === undefined) return
    const nextVisitedWordIds = new Set(visitedWordIds)
    nextVisitedWordIds.add(nextWord.id)
    setCurrentIndex(nextIndex)
    setRevealed(false)
    setVisitedWordIds(nextVisitedWordIds)
    if (nextVisitedWordIds.size === words.length) void saveCompletion()
  }

  if (currentWord === undefined) return null

  return (
    <section
      className="rounded-toss-card"
      aria-label="단어 학습 카드"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return
        if (event.key === 'ArrowLeft') {
          event.preventDefault()
          goTo(currentIndex - 1)
        } else if (event.key === 'ArrowRight') {
          event.preventDefault()
          goTo(currentIndex + 1)
        }
      }}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-toss-text" aria-live="polite">
          {currentIndex + 1} / {words.length}
          <span className="ml-2 font-normal text-toss-muted">열람 {visitedWordIds.size}개</span>
        </p>
        <div className="inline-flex rounded-full bg-toss-border p-0.5" aria-label="가림 방향 선택">
          {(['korean', 'english'] as const).map((direction) => (
            <button
              key={direction}
              type="button"
              className={cn(
                'relative isolate min-h-9 rounded-full px-2.5 text-xs font-semibold transition-colors motion-reduce:transition-none',
                hideDirection === direction
                  ? 'text-toss-blue'
                  : 'text-toss-muted',
              )}
              aria-pressed={hideDirection === direction}
              onClick={() => {
                setHideDirection(direction)
                setRevealed(false)
              }}
            >
              {hideDirection === direction ? (
                <SlidingPillIndicator
                  layoutId={hideDirectionIndicatorId}
                  className="bg-toss-surface shadow-sm"
                />
              ) : null}
              <span className="relative z-10">{direction === 'korean' ? '한국어 가리기' : '영어 가리기'}</span>
            </button>
          ))}
        </div>
      </div>

      <FlashCard
        key={currentWord.id}
        word={currentWord}
        hideDirection={hideDirection}
        revealed={revealed}
        mastered={progressByWordId.get(currentWord.id)?.isMastered ?? false}
        onReveal={() => setRevealed(true)}
        onToggleMastered={onToggleMastered}
      />

      <div className="mt-5 grid grid-cols-2 gap-3">
        <button
          type="button"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-toss-button border border-toss-border bg-toss-surface font-semibold text-toss-text disabled:cursor-not-allowed disabled:opacity-40"
          disabled={currentIndex === 0}
          onClick={() => goTo(currentIndex - 1)}
        >
          <ChevronLeft className="size-5" aria-hidden="true" />
          이전
        </button>
        <button
          type="button"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-toss-button bg-toss-blue font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
          disabled={currentIndex === words.length - 1}
          onClick={() => goTo(currentIndex + 1)}
        >
          다음
          <ChevronRight className="size-5" aria-hidden="true" />
        </button>
      </div>

      {completedStudy ? <p className="mt-4 text-center text-sm font-semibold text-toss-success">이 Day의 카드를 모두 학습했어요.</p> : null}
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
