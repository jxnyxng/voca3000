import { Check, Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import type { WordItem } from '../../types/word'
import { cn } from '../../utils/cn'
import { findTargetExpression } from './findTargetExpression'

export type HideDirection = 'korean' | 'english'

export interface FlashCardProps {
  word: WordItem
  hideDirection: HideDirection
  revealed: boolean
  mastered: boolean
  onReveal: () => void
  onToggleMastered: (wordId: string) => Promise<boolean>
}

export function FlashCard({
  word,
  hideDirection,
  revealed,
  mastered,
  onReveal,
  onToggleMastered,
}: FlashCardProps) {
  const [pendingMastered, setPendingMastered] = useState<boolean | null>(null)
  const [masteryError, setMasteryError] = useState<string | null>(null)
  const displayedMastered = pendingMastered ?? mastered
  const exampleParts = findTargetExpression(word.exampleEn, word.word)

  const toggleMastered = async (): Promise<void> => {
    if (pendingMastered !== null) return
    const nextMastered = !mastered
    setPendingMastered(nextMastered)
    setMasteryError(null)
    try {
      await onToggleMastered(word.id)
    } catch {
      setMasteryError('암기 상태를 저장하지 못했어요. 다시 시도해 주세요.')
    } finally {
      setPendingMastered(null)
    }
  }

  return (
    <article
      className="rounded-toss-card bg-toss-surface p-5 shadow-toss sm:p-8"
      aria-label={`${word.meaning} 학습 카드`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <span className="rounded-full bg-toss-bg px-3 py-1 text-xs font-semibold text-toss-muted">
          {word.partOfSpeech}
        </span>
        <button
          type="button"
          className={cn(
            'inline-flex min-h-11 items-center gap-2 rounded-toss-button border px-4 text-sm font-semibold transition-colors disabled:cursor-wait motion-reduce:transition-none',
            displayedMastered
              ? 'border-toss-success bg-toss-success/10 text-toss-success'
              : 'border-toss-border bg-toss-surface text-toss-text hover:bg-toss-bg',
          )}
          aria-pressed={displayedMastered}
          disabled={pendingMastered !== null}
          onClick={() => void toggleMastered()}
        >
          <Check className="size-4" aria-hidden="true" />
          {displayedMastered ? '외웠어요' : '외우는 중'}
        </button>
      </div>

      <div className="mt-8 text-center">
        {hideDirection === 'english' && !revealed ? (
          <button
            type="button"
            className="mx-auto flex min-h-14 items-center gap-2 rounded-toss-button bg-toss-ice-blue px-6 font-bold text-toss-blue"
            aria-expanded="false"
            aria-label={`${word.meaning}의 영어 표현 공개`}
            onClick={onReveal}
          >
            <Eye className="size-5" aria-hidden="true" />
            영어 표현 보기
          </button>
        ) : (
          <>
            <h2 id={`word-${word.id}`} className="text-3xl font-extrabold tracking-tight text-toss-text sm:text-4xl">
              {word.word}
            </h2>
            <p className="mt-2 text-sm text-toss-muted">{word.pronunciation}</p>
          </>
        )}

        <div className="mt-8 rounded-toss-button bg-toss-bg p-5 text-left">
          <p className="text-sm font-semibold text-toss-muted">뜻</p>
          {hideDirection === 'korean' && !revealed ? (
            <button
              type="button"
              className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-toss-button bg-toss-ice-blue px-4 font-semibold text-toss-blue"
              aria-expanded="false"
              aria-label={`${word.word}의 한국어 뜻과 번역 공개`}
              onClick={onReveal}
            >
              <Eye className="size-5" aria-hidden="true" />
              한국어 뜻 보기
            </button>
          ) : (
            <p className="mt-2 text-xl font-bold text-toss-text">{word.meaning}</p>
          )}
        </div>

        <div className="mt-5 text-left">
          <p className="text-sm font-semibold text-toss-muted">예문</p>
          <p className="mt-2 leading-7 text-toss-text">
            {hideDirection === 'english' && !revealed ? (
              exampleParts ? (
                <>
                  {exampleParts.before}
                  <button
                    type="button"
                    className="mx-1 rounded bg-toss-ice-blue px-2 py-1 font-semibold text-toss-blue"
                    aria-expanded="false"
                    aria-label="예문 속 영어 표현 공개"
                    onClick={onReveal}
                  >
                    <EyeOff className="inline size-4" aria-hidden="true" />
                    <span className="sr-only">가려진 영어 표현</span>
                  </button>
                  {exampleParts.after}
                </>
              ) : (
                <button
                  type="button"
                  className="min-h-11 rounded-toss-button bg-toss-ice-blue px-4 font-semibold text-toss-blue"
                  aria-expanded="false"
                  aria-label="영어 예문 공개"
                  onClick={onReveal}
                >
                  영어 예문 보기
                </button>
              )
            ) : (
              word.exampleEn
            )}
          </p>
          {hideDirection === 'korean' && !revealed ? null : (
            <p className="mt-2 leading-7 text-toss-muted">{word.exampleKo}</p>
          )}
        </div>
      </div>

      {revealed ? (
        <p className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-toss-success" role="status">
          <Eye className="size-4" aria-hidden="true" />
          정답을 공개했어요
        </p>
      ) : null}
      {masteryError ? <p className="mt-4 text-sm text-toss-error" role="alert">{masteryError}</p> : null}
    </article>
  )
}
