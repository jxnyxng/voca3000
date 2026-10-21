import { Eye, Volume2, VolumeX } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import { useSpeech } from '../../hooks/useSpeech'
import type { WordItem } from '../../types/word'
import { cn } from '../../utils/cn'
import { findTargetExpression } from './findTargetExpression'
import { MasteryToggleButton } from './MasteryToggleButton'

export type HideDirection = 'korean' | 'english'

export interface FlashCardProps {
  word: WordItem
  hideDirection: HideDirection
  revealed: boolean
  mastered: boolean
  position: number
  total: number
  onReveal: () => void
  onToggleMastered: (wordId: string) => Promise<boolean>
  showMasteryButton?: boolean
}

export function FlashCard({
  word,
  hideDirection,
  revealed,
  mastered,
  position,
  total,
  onReveal,
  onToggleMastered,
  showMasteryButton = true,
}: FlashCardProps) {
  const [pendingMastered, setPendingMastered] = useState<boolean | null>(null)
  const [masteryError, setMasteryError] = useState<string | null>(null)
  const isJapanese = word.language === 'ja'
  const targetLanguageName = isJapanese ? '일본어' : '영어'
  const speech = useSpeech(isJapanese ? 'ja-JP' : 'en-US')
  const shouldReduceMotion = useReducedMotion()
  const displayedMastered = pendingMastered ?? mastered
  const exampleParts = findTargetExpression(word.exampleEn, [word.word, ...word.acceptableAnswersEn])

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
      className="flex flex-1 flex-col rounded-toss-card border border-toss-border bg-toss-surface p-4 shadow-toss sm:p-6"
      aria-label={`${word.meaning} 학습 카드`}
    >
      <motion.div
        className="flex flex-1 flex-col"
        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={shouldReduceMotion
          ? { opacity: 0 }
          : { opacity: 0, scale: 0.98, transition: { duration: 0.14, ease: [0.4, 0, 1, 1] } }}
        transition={shouldReduceMotion
          ? { duration: 0.08 }
          : { type: 'spring', stiffness: 340, damping: 28, mass: 0.72 }}
      >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-toss-bg px-3 py-1 text-xs font-semibold text-toss-muted">
            {word.partOfSpeech}
          </span>
          <span className="text-xs font-semibold text-toss-muted">
            Day {word.day} · {position}/{total}
          </span>
        </div>
        {showMasteryButton ? <div className="flex flex-wrap items-center justify-end">
          <MasteryToggleButton
            mastered={displayedMastered}
            pending={pendingMastered !== null}
            size="card"
            onToggle={() => void toggleMastered()}
          />
        </div> : null}
      </div>
      {!speech.isSupported ? <p className="mt-2 text-right text-xs text-toss-muted">이 브라우저는 음성 재생을 지원하지 않아요.</p> : null}

      <div className="mt-4 text-center sm:mt-5 lg:flex lg:flex-1 lg:flex-col lg:justify-center">
        {hideDirection === 'english' ? (
          <>
            <h2 id={`word-${word.id}`} className="text-3xl font-extrabold tracking-tight text-toss-text sm:text-4xl">
              {word.meaning}
            </h2>
            <div className="mt-2 h-8" aria-hidden="true" />
          </>
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

        <div className="mt-4 rounded-toss-button bg-toss-bg p-3 text-center sm:mt-5 sm:p-4">
          <div className="grid h-16 place-items-center">
            <AnimatePresence mode="wait" initial={false}>
              {!revealed ? (
                <motion.button
                  key="reveal-button"
                  type="button"
                  className="inline-flex h-10 w-40 items-center justify-center gap-1.5 rounded-toss-button border border-toss-border bg-white px-3 text-sm font-semibold text-toss-text shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-toss-muted"
                  aria-expanded="false"
                  aria-label={
                    hideDirection === 'korean'
                      ? `${word.word}의 한국어 뜻과 번역 공개`
                      : `${word.meaning}의 ${targetLanguageName} 표현 공개`
                  }
                  whileHover={shouldReduceMotion ? undefined : { scale: 1.035 }}
                  whileTap={shouldReduceMotion ? undefined : { scale: 1.1 }}
                  exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 1.16 }}
                  transition={shouldReduceMotion ? { duration: 0.08 } : { duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                  onClick={onReveal}
                >
                  <Eye className="size-4" aria-hidden="true" />
                  {hideDirection === 'korean' ? '한국어 뜻 보기' : `${targetLanguageName} 표현 보기`}
                </motion.button>
              ) : (
                <motion.div
                  key="revealed-answer"
                  className="mx-auto flex h-16 w-fit min-w-40 max-w-full flex-col items-center justify-center px-3"
                  initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.72 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={shouldReduceMotion
                    ? { duration: 0.08 }
                    : { type: 'spring', stiffness: 520, damping: 15, mass: 0.7 }}
                >
                  {hideDirection === 'korean' ? (
                    <p className="text-lg font-bold text-toss-text sm:text-xl">{word.meaning}</p>
                  ) : (
                    <>
                      <p className="whitespace-nowrap text-lg font-bold text-toss-text sm:text-xl">{word.word}</p>
                      <div className="mt-0.5 flex items-center justify-center gap-1">
                        <p className="text-xs text-toss-muted sm:text-sm">{isJapanese ? `(${word.pronunciation})` : word.pronunciation}</p>
                        {pronunciationButton}
                      </div>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="mt-3 text-center sm:mt-4">
          <p className="text-sm font-semibold text-toss-muted">예문</p>
          <p className="mt-1 leading-6 text-toss-text">
            {hideDirection === 'english' && !revealed ? (
              exampleParts ? (
                <>
                  {exampleParts.before}
                  <span
                    className="mx-0.5 inline rounded-sm bg-toss-text text-transparent select-none"
                    aria-hidden="true"
                  >
                    {exampleParts.match}
                  </span>
                  {exampleParts.after}
                </>
              ) : (
                word.exampleEn
              )
            ) : (
              word.exampleEn
            )}
          </p>
          {isJapanese && word.examplePronunciation ? (
            <p
              className={cn(
                'mt-0.5 text-sm leading-5 text-toss-muted',
                hideDirection !== 'english' || revealed ? 'visible' : 'invisible',
              )}
              aria-hidden={hideDirection === 'english' && !revealed}
            >
              ({word.examplePronunciation})
            </p>
          ) : null}
          <p
            className={cn(
              'mt-1 leading-6 text-toss-muted',
              hideDirection === 'english' || revealed ? 'visible' : 'invisible',
            )}
            aria-hidden={hideDirection === 'korean' && !revealed}
          >
            → {word.exampleKo}
          </p>
        </div>
      </div>

      {masteryError ? <p className="mt-4 text-sm text-toss-error" role="alert">{masteryError}</p> : null}
      {speech.error ? <p className="mt-4 text-sm text-toss-error" role="alert">{speech.error}</p> : null}
      </motion.div>
    </article>
  )
}
