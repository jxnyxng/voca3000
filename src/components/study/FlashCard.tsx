import { Check, Eye, EyeOff, Volume2, VolumeX } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
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
  const shouldReduceMotion = useReducedMotion()
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
              <p className="text-sm text-toss-muted">{isJapanese ? `(${word.pronunciation})` : word.pronunciation}</p>
              {pronunciationButton}
            </div>
          </>
        )}

        <div className="mt-8 rounded-toss-button bg-toss-bg p-5 text-center">
          {hideDirection === 'english' ? (
            <p className="text-sm font-semibold text-toss-muted">{targetLanguageName} 표현</p>
          ) : null}
          <AnimatePresence mode="wait" initial={false}>
            {!revealed ? (
              <motion.button
                key="reveal-button"
                type="button"
                className={cn(
                  'inline-flex items-center rounded-toss-button border border-toss-blue/15 bg-toss-ice-blue font-semibold text-toss-blue shadow-sm transition-[background-color,border-color,box-shadow] hover:border-toss-blue/30 hover:bg-white hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-toss-blue',
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
                whileHover={shouldReduceMotion ? undefined : { y: -2, scale: 1.035 }}
                whileTap={shouldReduceMotion ? undefined : { scale: 1.1 }}
                exit={shouldReduceMotion
                  ? { opacity: 0 }
                  : { opacity: [1, 1, 0], scale: [1, 1.12, 0.82], y: [0, -2, 4] }}
                transition={shouldReduceMotion ? { duration: 0.08 } : { duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                onClick={onReveal}
              >
                <Eye className={hideDirection === 'korean' ? 'size-4' : 'size-5'} aria-hidden="true" />
                {hideDirection === 'korean' ? '한국어 뜻 보기' : `${targetLanguageName} 표현 보기`}
              </motion.button>
            ) : (
              <motion.div
                key="revealed-answer"
                className="mx-auto w-fit min-w-36 rounded-xl border border-toss-blue/15 bg-white px-5 py-3 shadow-sm"
                initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.88 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={shouldReduceMotion
                  ? { duration: 0.08 }
                  : { type: 'spring', stiffness: 420, damping: 22, mass: 0.75 }}
              >
                {hideDirection === 'korean' ? (
                  <p className="text-xl font-bold text-toss-text">{word.meaning}</p>
                ) : (
                  <>
                    <p className="text-xl font-bold text-toss-text">{word.word}</p>
                    <div className="mt-1 flex items-center justify-center gap-1">
                      <p className="text-sm text-toss-muted">{isJapanese ? `(${word.pronunciation})` : word.pronunciation}</p>
                      {pronunciationButton}
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
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
          {isJapanese && word.examplePronunciation ? (
            <p className="mt-1 text-sm leading-6 text-toss-muted">
              ({word.examplePronunciation})
            </p>
          ) : null}
          {hideDirection === 'english' || revealed ? (
            <p className="mt-2 leading-7 text-toss-muted">
              → {word.exampleKo}
            </p>
          ) : null}
        </div>
      </div>

      {masteryError ? <p className="mt-4 text-sm text-toss-error" role="alert">{masteryError}</p> : null}
      {speech.error ? <p className="mt-4 text-sm text-toss-error" role="alert">{speech.error}</p> : null}
    </article>
  )
}
