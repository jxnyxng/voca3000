import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react'
import {
  db,
  recordQuizResult,
  updateQuizHighScore,
  type VocaDatabase,
} from '../db'
import type { QuizMode, WordItem } from '../types/word'
import { evaluateQuizAnswer } from '../utils/textMatcher'
import { shuffledCopy } from '../utils/shuffle'
import {
  createInitialQuizState,
  quizSessionReducer,
  type QuizAttempt,
  type QuizState,
} from './quizSessionState'

export type { QuizAttempt, QuizPhase } from './quizSessionState'

export interface UseQuizSessionOptions {
  words: readonly WordItem[]
  day: number
  mode: QuizMode
  database?: VocaDatabase
  correctFeedbackDelayMs?: number
  incorrectFeedbackDelayMs?: number
  random?: () => number
}

export interface SubmitAnswerResult {
  accepted: boolean
  isCorrect?: boolean
  reason?: 'empty' | 'locked' | 'persistence-error'
}

export interface UseQuizSessionResult extends QuizState {
  currentWord: WordItem | undefined
  totalCount: number
  score: number
  incorrectAttempts: QuizAttempt[]
  submitAnswer: (answer: string) => Promise<SubmitAnswerResult>
  confirmIncorrect: () => Promise<boolean>
  retryCompletion: () => Promise<boolean>
  restart: () => boolean
}

const EMPTY_ANSWER_MESSAGE = '답안을 입력해 주세요.'

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error('Quiz persistence failed.', { cause: error })
}

export function useQuizSession({
  words,
  day,
  mode,
  database = db,
  correctFeedbackDelayMs = 650,
  incorrectFeedbackDelayMs = 400,
  random = Math.random,
}: UseQuizSessionOptions): UseQuizSessionResult {
  if (words.length === 0) {
    throw new Error('A quiz session requires at least one word.')
  }

  const [state, dispatch] = useReducer(quizSessionReducer, undefined, createInitialQuizState)
  const [orderedWords, setOrderedWords] = useState(() => shuffledCopy(words, random))
  const stateRef = useRef(state)
  const submissionLockedRef = useRef(false)
  const completionLockedRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const generationRef = useRef(0)

  useLayoutEffect(() => {
    stateRef.current = state
  }, [state])

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  useEffect(
    () => () => {
      generationRef.current += 1
      clearTimer()
    },
    [clearTimer],
  )

  const completeSession = useCallback(
    async (correctCount: number, generation: number): Promise<boolean> => {
      if (completionLockedRef.current || generation !== generationRef.current) {
        return false
      }

      completionLockedRef.current = true
      const score = Math.round((correctCount / orderedWords.length) * 100)

      try {
        const isNewHighScore = await updateQuizHighScore(day, mode, score, database)
        if (generation !== generationRef.current) {
          return false
        }
        dispatch({ type: 'session-completed', isNewHighScore })
        return true
      } catch (error) {
        if (generation === generationRef.current) {
          dispatch({ type: 'completion-persistence-failed', error: toError(error) })
        }
        return false
      } finally {
        completionLockedRef.current = false
      }
    },
    [database, day, mode, orderedWords.length],
  )

  const advanceOrComplete = useCallback(
    async (
      currentIndex: number,
      correctCount: number,
      generation: number,
    ): Promise<boolean> => {
      if (generation !== generationRef.current) {
        return false
      }
      if (currentIndex === orderedWords.length - 1) {
        return completeSession(correctCount, generation)
      }

      submissionLockedRef.current = false
      dispatch({ type: 'question-advanced', nextIndex: currentIndex + 1 })
      return true
    },
    [completeSession, orderedWords.length],
  )

  const submitAnswer = useCallback(
    async (answer: string): Promise<SubmitAnswerResult> => {
      if (submissionLockedRef.current || stateRef.current.phase !== 'answering') {
        return { accepted: false, reason: 'locked' }
      }

      const currentWord = orderedWords[stateRef.current.currentIndex]
      if (currentWord === undefined) {
        return { accepted: false, reason: 'locked' }
      }
      const evaluation = evaluateQuizAnswer(answer, currentWord, mode)
      if (evaluation.normalizedInput === '') {
        dispatch({ type: 'input-rejected', message: EMPTY_ANSWER_MESSAGE })
        return { accepted: false, reason: 'empty' }
      }

      submissionLockedRef.current = true
      const generation = generationRef.current
      const currentIndex = stateRef.current.currentIndex
      dispatch({ type: 'evaluation-started' })

      try {
        await recordQuizResult(currentWord.id, mode, evaluation.isCorrect, database)
      } catch (error) {
        if (generation === generationRef.current) {
          submissionLockedRef.current = false
          dispatch({ type: 'result-persistence-failed', error: toError(error) })
        }
        return { accepted: false, reason: 'persistence-error' }
      }

      if (generation !== generationRef.current) {
        return { accepted: false, reason: 'locked' }
      }

      const attempt: QuizAttempt = {
        wordId: currentWord.id,
        answer,
        isCorrect: evaluation.isCorrect,
        correctAnswer: mode === 'ko-to-en' ? currentWord.word : currentWord.meaning,
      }
      const nextCorrectCount = stateRef.current.correctCount + (evaluation.isCorrect ? 1 : 0)

      if (evaluation.isCorrect) {
        dispatch({ type: 'correct-feedback-started', attempt })
        clearTimer()
        timerRef.current = setTimeout(() => {
          timerRef.current = null
          void advanceOrComplete(currentIndex, nextCorrectCount, generation)
        }, correctFeedbackDelayMs)
      } else {
        dispatch({ type: 'incorrect-feedback-started', attempt })
        clearTimer()
        timerRef.current = setTimeout(() => {
          timerRef.current = null
          if (generation === generationRef.current) {
            dispatch({ type: 'confirmation-requested' })
          }
        }, incorrectFeedbackDelayMs)
      }

      return { accepted: true, isCorrect: evaluation.isCorrect }
    },
    [
      advanceOrComplete,
      clearTimer,
      correctFeedbackDelayMs,
      database,
      incorrectFeedbackDelayMs,
      mode,
      orderedWords,
    ],
  )

  const confirmIncorrect = useCallback(async (): Promise<boolean> => {
    const current = stateRef.current
    if (current.phase !== 'waiting-confirmation') {
      return false
    }
    return advanceOrComplete(current.currentIndex, current.correctCount, generationRef.current)
  }, [advanceOrComplete])

  const retryCompletion = useCallback(async (): Promise<boolean> => {
    const current = stateRef.current
    const isFinalFeedback =
      current.currentIndex === orderedWords.length - 1 &&
      (current.phase === 'feedback-correct' || current.phase === 'waiting-confirmation')
    if (!isFinalFeedback || current.persistenceError === null) {
      return false
    }
    return completeSession(current.correctCount, generationRef.current)
  }, [completeSession, orderedWords.length])

  const restart = useCallback((): boolean => {
    if (stateRef.current.phase === 'evaluating' || completionLockedRef.current) {
      return false
    }
    generationRef.current += 1
    clearTimer()
    submissionLockedRef.current = false
    completionLockedRef.current = false
    setOrderedWords((current) => shuffledCopy(current, random))
    const nextState = createInitialQuizState()
    stateRef.current = nextState
    dispatch({ type: 'restarted' })
    return true
  }, [clearTimer, random])

  const score = Math.round((state.correctCount / orderedWords.length) * 100)

  return {
    ...state,
    currentWord: orderedWords[state.currentIndex],
    totalCount: orderedWords.length,
    score,
    incorrectAttempts: state.attempts.filter((attempt) => !attempt.isCorrect),
    submitAnswer,
    confirmIncorrect,
    retryCompletion,
    restart,
  }
}
