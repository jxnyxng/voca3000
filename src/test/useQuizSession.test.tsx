import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { deleteDatabase, VocaDatabase } from '../db'
import { useQuizSession } from '../hooks/useQuizSession'
import { quizWords as words } from './fixtures/quiz'

let database: VocaDatabase
let databaseNumber = 0

beforeEach(() => {
  databaseNumber += 1
  database = new VocaDatabase(`Voca3000QuizTestDB-${databaseNumber}`)
})

afterEach(async () => {
  vi.restoreAllMocks()
  await deleteDatabase(database)
})

function renderSession() {
  return renderHook(() =>
    useQuizSession({
      words,
      day: 1,
      mode: 'ko-to-en',
      database,
      correctFeedbackDelayMs: 5,
      incorrectFeedbackDelayMs: 5,
      random: () => 0.999,
    }),
  )
}

describe('useQuizSession', () => {
  it('randomizes the question order when a session starts and restarts', () => {
    const { result } = renderHook(() =>
      useQuizSession({
        words,
        day: 1,
        mode: 'ko-to-en',
        database,
        random: () => 0,
      }),
    )

    expect(result.current.currentWord?.id).toBe('w0002')
    act(() => expect(result.current.restart()).toBe(true))
    expect(result.current.currentWord?.id).toBe('w0001')
  })

  it('rejects empty input without grading or writing progress', async () => {
    const { result } = renderSession()

    await act(async () => {
      await expect(result.current.submitAnswer(' ... ')).resolves.toEqual({
        accepted: false,
        reason: 'empty',
      })
    })

    expect(result.current.phase).toBe('answering')
    expect(result.current.inputError).toBe('답안을 입력해 주세요.')
    expect(await database.progress.count()).toBe(0)
  })

  it('locks duplicate submissions before the first database write resolves', async () => {
    const { result } = renderSession()

    let firstSubmission: Promise<unknown>
    await act(async () => {
      firstSubmission = result.current.submitAnswer('commute')
      await expect(result.current.submitAnswer('commute')).resolves.toEqual({
        accepted: false,
        reason: 'locked',
      })
      await firstSubmission!
    })

    expect((await database.progress.get('w0001'))?.correctCountKoToEn).toBe(1)
    expect(result.current.attempts).toHaveLength(1)
  })

  it('advances automatically after correct feedback', async () => {
    const { result } = renderSession()

    await act(async () => {
      await result.current.submitAnswer('commute')
    })
    expect(result.current.phase).toBe('feedback-correct')

    await waitFor(() => expect(result.current.phase).toBe('answering'))
    expect(result.current.currentIndex).toBe(1)
    expect(result.current.correctCount).toBe(1)
  })

  it('blocks an incorrect answer until feedback ends and the user confirms', async () => {
    const { result } = renderSession()

    await act(async () => {
      await result.current.submitAnswer('wrong')
    })
    expect(result.current.phase).toBe('feedback-incorrect')
    await expect(result.current.confirmIncorrect()).resolves.toBe(false)

    await waitFor(() => expect(result.current.phase).toBe('waiting-confirmation'))
    await act(async () => {
      await expect(result.current.confirmIncorrect()).resolves.toBe(true)
    })

    expect(result.current.phase).toBe('answering')
    expect(result.current.currentIndex).toBe(1)
    expect(result.current.incorrectAttempts).toHaveLength(1)
  })

  it('completes only after final feedback and stores the rounded high score', async () => {
    const { result } = renderSession()

    await act(async () => {
      await result.current.submitAnswer('commute')
    })
    await waitFor(() => expect(result.current.currentIndex).toBe(1))
    await act(async () => {
      await result.current.submitAnswer('wrong')
    })
    await waitFor(() => expect(result.current.phase).toBe('waiting-confirmation'))

    expect(await database.daySessions.get(1)).toBeUndefined()
    await act(async () => {
      await result.current.confirmIncorrect()
    })

    expect(result.current.phase).toBe('completed')
    expect(result.current.score).toBe(50)
    expect(result.current.isNewHighScore).toBe(true)
    expect(await database.daySessions.get(1)).toMatchObject({ koToEnHighScore: 50 })
  })

  it('does not update a high score when an incomplete session unmounts', async () => {
    const { result, unmount } = renderSession()

    await act(async () => {
      await result.current.submitAnswer('wrong')
    })
    await waitFor(() => expect(result.current.phase).toBe('waiting-confirmation'))
    unmount()

    expect(await database.daySessions.get(1)).toBeUndefined()
    expect((await database.progress.get('w0001'))?.incorrectCountKoToEn).toBe(1)
  })

  it('cancels correct-feedback completion when the session unmounts', async () => {
    const { result, unmount } = renderHook(() =>
      useQuizSession({
        words: [words[0]!],
        day: 1,
        mode: 'ko-to-en',
        database,
        correctFeedbackDelayMs: 30,
      }),
    )

    await act(async () => {
      await result.current.submitAnswer('commute')
    })
    expect(result.current.phase).toBe('feedback-correct')
    unmount()
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(await database.daySessions.get(1)).toBeUndefined()
    expect((await database.progress.get('w0001'))?.correctCountKoToEn).toBe(1)
  })

  it('invalidates a pending feedback timer when the session restarts', async () => {
    const { result } = renderHook(() =>
      useQuizSession({
        words,
        day: 1,
        mode: 'ko-to-en',
        database,
        correctFeedbackDelayMs: 30,
        random: () => 0.999,
      }),
    )

    await act(async () => {
      await result.current.submitAnswer('commute')
    })
    act(() => expect(result.current.restart()).toBe(true))
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(result.current.phase).toBe('answering')
    expect(result.current.currentIndex).toBe(0)
    expect(result.current.attempts).toEqual([])
  })

  it('returns to answering after a result write failure and permits one retry', async () => {
    const put = vi.spyOn(database.progress, 'put').mockRejectedValueOnce(new Error('write failed'))
    const { result } = renderSession()

    await act(async () => {
      await expect(result.current.submitAnswer('commute')).resolves.toEqual({
        accepted: false,
        reason: 'persistence-error',
      })
    })
    expect(result.current.phase).toBe('answering')
    expect(result.current.persistenceError?.message).toBe('write failed')

    put.mockRestore()
    await act(async () => {
      await expect(result.current.submitAnswer('commute')).resolves.toMatchObject({
        accepted: true,
        isCorrect: true,
      })
    })
    expect((await database.progress.get('w0001'))?.correctCountKoToEn).toBe(1)
  })

  it('keeps final feedback visible when high-score persistence fails and retries completion', async () => {
    const { result } = renderHook(() =>
      useQuizSession({
        words: [words[0]!],
        day: 1,
        mode: 'ko-to-en',
        database,
        correctFeedbackDelayMs: 5,
      }),
    )
    const put = vi.spyOn(database.daySessions, 'put').mockRejectedValueOnce(new Error('score failed'))

    await act(async () => {
      await result.current.submitAnswer('commute')
    })
    await waitFor(() => expect(result.current.persistenceError?.message).toBe('score failed'))
    expect(result.current.phase).toBe('feedback-correct')

    put.mockRestore()
    await act(async () => {
      await expect(result.current.retryCompletion()).resolves.toBe(true)
    })
    expect(result.current.phase).toBe('completed')
    expect(await database.daySessions.get(1)).toMatchObject({ koToEnHighScore: 100 })
  })

  it('restarts a settled session but refuses restart during evaluation', async () => {
    const { result } = renderSession()

    let submission: Promise<unknown>
    act(() => {
      submission = result.current.submitAnswer('wrong')
    })
    expect(result.current.restart()).toBe(false)
    await act(async () => {
      await submission!
    })
    await waitFor(() => expect(result.current.phase).toBe('waiting-confirmation'))

    act(() => expect(result.current.restart()).toBe(true))
    expect(result.current.phase).toBe('answering')
    expect(result.current.currentIndex).toBe(0)
    expect(result.current.attempts).toEqual([])
  })
})
