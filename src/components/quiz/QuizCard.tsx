import { CheckCircle2, RotateCcw, XCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { VocaDatabase } from '../../db'
import { useQuizSession } from '../../hooks/useQuizSession'
import type { QuizMode, WordItem } from '../../types/word'
import type { AppTab } from '../../types/navigation'
import { cn } from '../../utils/cn'
import { ShakeWrapper } from './ShakeWrapper'
import { QuizScore } from './QuizScore'

export interface QuizCardProps {
  words: readonly WordItem[]
  day: number
  mode: QuizMode
  database?: VocaDatabase
  correctFeedbackDelayMs?: number
  incorrectFeedbackDelayMs?: number
  onNavigate?: (tab: AppTab) => void
}

export function QuizCard({
  words,
  day,
  mode,
  database,
  correctFeedbackDelayMs,
  incorrectFeedbackDelayMs,
  onNavigate = () => undefined,
}: QuizCardProps) {
  const quiz = useQuizSession({
    words,
    day,
    mode,
    database,
    correctFeedbackDelayMs,
    incorrectFeedbackDelayMs,
  })
  const [answer, setAnswer] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const isComposingRef = useRef(false)
  const previousIndexRef = useRef(quiz.currentIndex)
  const isAnswering = quiz.phase === 'answering'
  const isIncorrectFeedback = quiz.phase === 'feedback-incorrect' || quiz.phase === 'waiting-confirmation'

  useEffect(() => {
    if (previousIndexRef.current === quiz.currentIndex) return
    previousIndexRef.current = quiz.currentIndex
    setAnswer('')
    inputRef.current?.focus()
  }, [quiz.currentIndex])

  const submit = (): void => {
    if (isComposingRef.current || !isAnswering) return
    void quiz.submitAnswer(answer)
  }

  if (quiz.phase === 'completed') {
    return (
      <QuizScore
        correctCount={quiz.correctCount}
        totalCount={quiz.totalCount}
        score={quiz.score}
        isNewHighScore={quiz.isNewHighScore}
        incorrectAttempts={quiz.incorrectAttempts}
        words={words}
        mode={mode}
        onRestart={() => {
          if (quiz.restart()) setAnswer('')
        }}
        onGoToIncorrect={() => onNavigate('incorrect')}
        onGoToStudy={() => onNavigate('study')}
      />
    )
  }

  const word = quiz.currentWord
  if (!word) return null
  const prompt = mode === 'ko-to-en' ? word.meaning : word.word
  const directionLabel = mode === 'ko-to-en' ? '영어 표현' : '한국어 뜻'
  const feedbackMessage = quiz.phase === 'feedback-correct'
    ? '정답이에요. 다음 문제로 이동합니다.'
    : isIncorrectFeedback
      ? `아쉬워요. 정답은 ${mode === 'ko-to-en' ? word.word : word.meaning}입니다.`
      : quiz.phase === 'evaluating'
        ? '답안을 확인하고 있어요.'
        : ''

  return (
    <section className="lg:flex lg:h-full lg:min-h-0 lg:flex-col" aria-labelledby={`${mode}-quiz-title`}>
      <div className="mb-4 flex min-h-9 items-center justify-between gap-3 text-sm">
        <h2 id={`${mode}-quiz-title`} className="sr-only">
          {mode === 'ko-to-en' ? '한→영 퀴즈' : '영→한 퀴즈'}
        </h2>
        <p className="font-semibold text-toss-text" aria-live="polite">
          {quiz.currentIndex + 1} / {quiz.totalCount}
        </p>
        <span className="rounded-full bg-toss-ice-blue px-3 py-1 text-xs font-bold text-toss-blue">
          {mode === 'ko-to-en' ? '한→영 퀴즈' : '영→한 퀴즈'}
        </span>
      </div>

      <ShakeWrapper
        shake={quiz.phase === 'feedback-incorrect'}
        className="lg:flex lg:min-h-0 lg:flex-1"
      >
        <div className={cn(
          'w-full rounded-toss-card border-2 bg-toss-surface p-6 text-center shadow-toss transition-colors motion-reduce:transition-none sm:p-8 lg:flex lg:h-full lg:flex-col lg:justify-center',
          isIncorrectFeedback ? 'border-toss-error' : quiz.phase === 'feedback-correct' ? 'border-toss-success' : 'border-transparent',
        )}>
          <div>
            <p className="text-sm font-semibold text-toss-muted">{directionLabel}을 입력하세요</p>
            <p className="mt-4 text-2xl font-extrabold text-toss-text sm:text-3xl">{prompt}</p>
            {mode === 'en-to-ko' ? <p className="mt-2 text-sm text-toss-muted">{word.pronunciation}</p> : null}
          </div>

          <form
            className="mt-8"
            onSubmit={(event) => {
              event.preventDefault()
              submit()
            }}
          >
            <label className="text-sm font-semibold text-toss-text" htmlFor={`${mode}-answer`}>
              내 답안
            </label>
            <input
              ref={inputRef}
              id={`${mode}-answer`}
              className={cn(
                'mt-2 min-h-12 w-full rounded-toss-button border bg-white px-4 text-center text-base text-toss-text disabled:bg-toss-bg',
                isIncorrectFeedback ? 'border-toss-error' : 'border-toss-border focus:border-toss-blue',
              )}
              value={answer}
              disabled={!isAnswering}
              aria-invalid={quiz.inputError !== null || isIncorrectFeedback}
              aria-describedby={quiz.inputError ? `${mode}-input-error` : undefined}
              autoComplete="off"
              onChange={(event) => setAnswer(event.target.value)}
              onCompositionStart={() => { isComposingRef.current = true }}
              onCompositionEnd={() => { isComposingRef.current = false }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && (event.nativeEvent.isComposing || isComposingRef.current)) {
                  event.preventDefault()
                }
              }}
            />
            {quiz.inputError ? <p id={`${mode}-input-error`} className="mt-2 text-sm text-toss-error" role="alert">{quiz.inputError}</p> : null}

            {isAnswering ? (
              <button type="submit" className="mt-4 min-h-12 w-full rounded-toss-button bg-toss-blue px-5 font-semibold text-white hover:bg-toss-blue-hover">
                정답 확인
              </button>
            ) : null}
          </form>

          <div className="mt-4 min-h-7" aria-live="polite" aria-atomic="true">
            {feedbackMessage ? (
              <p className={cn(
                'inline-flex items-center justify-center gap-2 font-semibold',
                isIncorrectFeedback ? 'text-toss-error' : quiz.phase === 'feedback-correct' ? 'text-toss-success' : 'text-toss-muted',
              )}>
                {isIncorrectFeedback ? <XCircle className="size-5" aria-hidden="true" /> : quiz.phase === 'feedback-correct' ? <CheckCircle2 className="size-5" aria-hidden="true" /> : null}
                {feedbackMessage}
              </p>
            ) : null}
          </div>

          {quiz.phase === 'waiting-confirmation' ? (
            <button
              type="button"
              className="mt-4 min-h-12 w-full rounded-toss-button bg-toss-blue px-5 font-semibold text-white hover:bg-toss-blue-hover"
              onClick={() => { void quiz.confirmIncorrect() }}
            >
              확인하고 다음 문제
            </button>
          ) : null}

          {quiz.persistenceError ? (
            <div className="mt-4" role="alert">
              <p className="text-sm text-toss-error">퀴즈 기록을 저장하지 못했어요. 다시 시도해 주세요.</p>
              {quiz.currentIndex === quiz.totalCount - 1 && quiz.phase !== 'answering' ? (
                <button type="button" className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-toss-button border border-toss-border px-4 font-semibold" onClick={() => { void quiz.retryCompletion() }}>
                  <RotateCcw className="size-4" aria-hidden="true" />
                  완료 저장 다시 시도
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </ShakeWrapper>
      <div className="mt-5 hidden min-h-12 lg:block" aria-hidden="true" />
    </section>
  )
}
