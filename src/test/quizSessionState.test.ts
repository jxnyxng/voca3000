import { describe, expect, it } from 'vitest'
import {
  createInitialQuizState,
  quizSessionReducer,
  type QuizAttempt,
} from '../hooks/quizSessionState'

const correctAttempt: QuizAttempt = {
  wordId: 'w0001',
  answer: 'commute',
  isCorrect: true,
  correctAnswer: 'commute',
}

const incorrectAttempt: QuizAttempt = {
  ...correctAttempt,
  answer: 'wrong',
  isCorrect: false,
}

describe('quizSessionReducer', () => {
  it('records correct feedback and advances while preserving the attempt', () => {
    const feedback = quizSessionReducer(createInitialQuizState(), {
      type: 'correct-feedback-started',
      attempt: correctAttempt,
    })
    expect(feedback).toMatchObject({
      phase: 'feedback-correct',
      correctCount: 1,
      attempts: [correctAttempt],
    })

    const advanced = quizSessionReducer(feedback, { type: 'question-advanced', nextIndex: 1 })
    expect(advanced).toMatchObject({
      phase: 'answering',
      currentIndex: 1,
      correctCount: 1,
      attempts: [correctAttempt],
    })
  })

  it('moves incorrect feedback through explicit confirmation', () => {
    const feedback = quizSessionReducer(createInitialQuizState(), {
      type: 'incorrect-feedback-started',
      attempt: incorrectAttempt,
    })
    expect(feedback.phase).toBe('feedback-incorrect')
    expect(feedback.correctCount).toBe(0)
    expect(feedback.attempts).toEqual([incorrectAttempt])

    const confirmation = quizSessionReducer(feedback, { type: 'confirmation-requested' })
    expect(confirmation.phase).toBe('waiting-confirmation')
  })

  it('restores answering after result persistence fails', () => {
    const evaluating = quizSessionReducer(createInitialQuizState(), { type: 'evaluation-started' })
    const error = new Error('write failed')
    const failed = quizSessionReducer(evaluating, { type: 'result-persistence-failed', error })

    expect(failed.phase).toBe('answering')
    expect(failed.persistenceError).toBe(error)
  })

  it('completes and resets the entire session on restart', () => {
    const completed = quizSessionReducer(createInitialQuizState(), {
      type: 'session-completed',
      isNewHighScore: true,
    })
    expect(completed).toMatchObject({ phase: 'completed', isNewHighScore: true })

    expect(quizSessionReducer(completed, { type: 'restarted' })).toEqual(createInitialQuizState())
  })
})
