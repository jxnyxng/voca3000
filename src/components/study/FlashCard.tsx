import { Check, Eye, EyeOff, Volume2, VolumeX } from 'lucide-react'
import { useState } from 'react'
import { useSpeech } from '../../hooks/useSpeech'
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
  const isJapanese = word.language === 'ja'
  const targetLanguageName = isJapanese ? '일본어' : '영어'
  const speech = useSpeech(isJapanese ? 'ja-JP' : 'en-US')
  const displayedMastered = pendingMastered ?? mastered
  const exampleParts = findTargetExpression(word.exampleEn, word.word)

  const pronunciationButton = (
    <button
      type="button"
      className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-toss-muted transition-colors hover:bg-toss-bg hover:text-toss-blue disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none"
      aria-label={speech.isPlaying ? `${word.word} 발음 중지` : `${word.word} 발음 듣기`}
      disabled={!speech.isSupported}
      onClick={() => {
        if (speech.isPlaying) speech.stop()
        else speech.speak(word.word)
      }}
    >
      {speech.isPlaying ? <VolumeX className="size-4" aria-hidden="true" /> : <Volume2 className="size-4" aria-hidden="true" />}
    </button>
  )

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
      className="rounded-toss-card bg-toss-surface p-5 shadow-toss sm:p-8 lg:flex lg:min-h-[28rem] lg:flex-col"
      aria-label={`${word.meaning} 학습 카드`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="rounded-full bg-toss-bg px-3 py-1 text-xs font-semibold text-toss-muted">
          {word.partOfSpeech}
        </span>
        <div className="flex flex-wrap items-center justify-end">
          <button
            type="button"
            className={cn(
              'inline-flex min-h-7 items-center gap-1 rounded-full border px-2 text-[0.6875rem] font-semibold transition-colors disabled:cursor-wait motion-reduce:transition-none',
              displayedMastered
                ? 'border-toss-success/30 bg-toss-success/10 text-toss-success'
                : 'border-transparent bg-toss-bg text-toss-muted hover:bg-toss-border/60 hover:text-toss-text',
            )}
            aria-pressed={displayedMastered}
            disabled={pendingMastered !== null}
            onClick={() => void toggleMastered()}
          >
            <Check className="size-3" aria-hidden="true" />
            {displayedMastered ? '외웠어요' : '외우는 중'}
          </button>
        </div>
      </div>
      {!speech.isSupported ? <p className="mt-2 text-right text-xs text-toss-muted">이 브라우저는 음성 재생을 지원하지 않아요.</p> : null}

      <div className="mt-8 text-center lg:flex lg:flex-1 lg:flex-col lg:justify-center">
        {hideDirection === 'english' ? (
          <h2 id={`word-${word.id}`} className="text-3xl font-extrabold tracking-tight text-toss-text sm:text-4xl">
            {word.meaning}
          </h2>
        ) : (
          <>
            <h2 id={`word-${word.id}`} className="text-3xl font-extrabold tracking-tight text-toss-text sm:text-4xl">
              {word.word}
            </h2>
            <div className="mt-2 flex items-center justify-center gap-1">
              <p className="text-sm text-toss-muted">{isJapanese ? `한국어 발음 · ${word.pronunciation}` : word.pronunciation}</p>
              {pronunciationButton}
            </div>
          </>
        )}

        <div className="mt-8 rounded-toss-button bg-toss-bg p-5 text-center">
          {hideDirection === 'english' ? (
            <p className="text-sm font-semibold text-toss-muted">{targetLanguageName} 표현</p>
          ) : null}
          {!revealed ? (
            <button
              type="button"
              className={cn(
                'inline-flex items-center rounded-toss-button bg-toss-ice-blue font-semibold text-toss-blue',
                hideDirection === 'korean'
                  ? 'min-h-9 gap-1.5 px-3 text-sm'
                  : 'mt-3 min-h-11 gap-2 px-4',
              )}
              aria-expanded="false"
              aria-label={
                hideDirection === 'korean'
                  ? `${word.word}의 한국어 뜻과 번역 공개`
                  : `${word.meaning}의 ${targetLanguageName} 표현 공개`
              }
              onClick={onReveal}
            >
              <Eye className={hideDirection === 'korean' ? 'size-4' : 'size-5'} aria-hidden="true" />
              {hideDirection === 'korean' ? '한국어 뜻 보기' : `${targetLanguageName} 표현 보기`}
            </button>
          ) : hideDirection === 'korean' ? (
            <p className="mt-2 text-xl font-bold text-toss-text">{word.meaning}</p>
          ) : (
            <div className="mt-2">
              <p className="text-xl font-bold text-toss-text">{word.word}</p>
              <div className="mt-1 flex items-center justify-center gap-1">
                <p className="text-sm text-toss-muted">{isJapanese ? `한국어 발음 · ${word.pronunciation}` : word.pronunciation}</p>
                {pronunciationButton}
              </div>
            </div>
          )}
        </div>

        <div className="mt-5 text-center">
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
                    aria-label={`예문 속 ${targetLanguageName} 표현 공개`}
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
                  aria-label={`${targetLanguageName} 예문 공개`}
                  onClick={onReveal}
                >
                  {targetLanguageName} 예문 보기
                </button>
              )
            ) : (
              word.exampleEn
            )}
          </p>
        </div>
      </div>

      {revealed ? (
        <p className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-toss-success" role="status">
          <Eye className="size-4" aria-hidden="true" />
          정답을 공개했어요
        </p>
      ) : null}
      {masteryError ? <p className="mt-4 text-sm text-toss-error" role="alert">{masteryError}</p> : null}
      {speech.error ? <p className="mt-4 text-sm text-toss-error" role="alert">{speech.error}</p> : null}
    </article>
  )
}
