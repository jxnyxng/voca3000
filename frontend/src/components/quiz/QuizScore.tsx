import confetti from 'canvas-confetti'
import { ArrowLeft, BookOpen, RotateCcw, Trophy } from 'lucide-react'
import { useReducedMotion } from 'motion/react'
import { useEffect, useRef } from 'react'
import type { QuizAttempt } from '../../hooks/useQuizSession'
import type { QuizMode, WordItem } from '../../types/word'

export interface QuizScoreProps {
  correctCount: number
  totalCount: number
  score: number
  isNewHighScore: boolean
  incorrectAttempts: readonly QuizAttempt[]
  words: readonly WordItem[]
  mode: QuizMode
  onRestart: () => void
  onGoToIncorrect: () => void
  onGoToStudy: () => void
}

export function QuizScore({
  correctCount,
  totalCount,
  score,
  isNewHighScore,
  incorrectAttempts,
  words,
  mode,
  onRestart,
  onGoToIncorrect,
  onGoToStudy,
}: QuizScoreProps) {
  const reduceMotion = useReducedMotion()
  const celebratedRef = useRef(false)
  const wordsById = new Map(words.map((word) => [word.id, word]))

  useEffect(() => {
    if (score !== 100 || reduceMotion || celebratedRef.current) return
    celebratedRef.current = true
    void confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } })
  }, [reduceMotion, score])

  return (
    <section className="rounded-toss-card bg-toss-surface p-6 shadow-toss sm:p-8" aria-labelledby={`${mode}-score-title`}>
      <div className="text-center">
        <Trophy className="mx-auto size-11 text-toss-blue" aria-hidden="true" />
        <h2 id={`${mode}-score-title`} className="mt-3 text-2xl font-extrabold text-toss-text">퀴즈 완료</h2>
        <p className="mt-4 text-4xl font-extrabold text-toss-blue">{score}점</p>
        <p className="mt-2 font-semibold text-toss-muted">{correctCount} / {totalCount} 정답</p>
        {isNewHighScore ? <p className="mt-3 font-semibold text-toss-success" role="status">새로운 최고 점수예요!</p> : null}
      </div>

      <div className="mt-8">
        <h3 className="text-lg font-bold text-toss-text">틀린 단어</h3>
        {incorrectAttempts.length === 0 ? (
          <p className="mt-3 rounded-toss-button bg-toss-success/10 p-4 font-semibold text-toss-success">모든 문제를 맞혔어요.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {incorrectAttempts.map((attempt) => {
              const word = wordsById.get(attempt.wordId)
              const prompt = word ? (mode === 'ko-to-en' ? word.meaning : word.word) : attempt.wordId
              return (
                <li key={attempt.wordId} className="rounded-toss-button bg-toss-bg p-4">
                  <p className="font-bold text-toss-text">{prompt}</p>
                  <p className="mt-2 text-sm text-toss-error">내 답: {attempt.answer}</p>
                  <p className="mt-1 text-sm font-semibold text-toss-success">정답: {attempt.correctAnswer}</p>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <button type="button" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-toss-button bg-toss-blue px-4 font-semibold text-white" onClick={onRestart}>
          <RotateCcw className="size-4" aria-hidden="true" />
          다시 풀기
        </button>
        <button type="button" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-toss-button border border-toss-border px-4 font-semibold text-toss-text" onClick={onGoToIncorrect}>
          <BookOpen className="size-4" aria-hidden="true" />
          오답노트
        </button>
        <button type="button" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-toss-button border border-toss-border px-4 font-semibold text-toss-text" onClick={onGoToStudy}>
          <ArrowLeft className="size-4" aria-hidden="true" />
          단어장으로
        </button>
      </div>
    </section>
  )
}
