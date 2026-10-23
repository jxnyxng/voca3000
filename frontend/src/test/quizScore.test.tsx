import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QuizScore } from '../components/quiz/QuizScore'
import type { QuizAttempt } from '../hooks/useQuizSession'
import type { WordItem } from '../types/word'

const mocks = vi.hoisted(() => ({
  confetti: vi.fn(),
  reducedMotion: false,
}))

vi.mock('canvas-confetti', () => ({ default: mocks.confetti }))
vi.mock('motion/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('motion/react')>()
  return { ...actual, useReducedMotion: () => mocks.reducedMotion }
})

const words: WordItem[] = [
  {
    id: 'w0001',
    day: 1,
    category: 'Daily Life',
    word: 'commute',
    meaning: '출퇴근하다',
    pronunciation: '/kəˈmjuːt/',
    partOfSpeech: 'verb',
    exampleEn: 'I commute by subway.',
    exampleKo: '나는 지하철로 출퇴근한다.',
    acceptableAnswersKo: ['통근하다'],
    acceptableAnswersEn: [],
  },
]

const incorrectAttempts: QuizAttempt[] = [{
  wordId: 'w0001',
  answer: 'wrong',
  isCorrect: false,
  correctAnswer: 'commute',
}]

beforeEach(() => {
  mocks.confetti.mockReset()
  mocks.reducedMotion = false
})

function renderScore(overrides: Partial<React.ComponentProps<typeof QuizScore>> = {}) {
  const props: React.ComponentProps<typeof QuizScore> = {
    correctCount: 0,
    totalCount: 1,
    score: 0,
    isNewHighScore: false,
    incorrectAttempts,
    words,
    mode: 'ko-to-en',
    onRestart: vi.fn(),
    onGoToIncorrect: vi.fn(),
    onGoToStudy: vi.fn(),
    ...overrides,
  }
  return { ...render(<QuizScore {...props} />), props }
}

describe('QuizScore', () => {
  it('shows the score, new high score, and incorrect answer details', () => {
    renderScore({ isNewHighScore: true })

    expect(screen.getByRole('heading', { name: '퀴즈 완료' })).toBeInTheDocument()
    expect(screen.getByText('0점')).toBeInTheDocument()
    expect(screen.getByText('0 / 1 정답')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('새로운 최고 점수')
    expect(screen.getByText('출퇴근하다')).toBeInTheDocument()
    expect(screen.getByText('내 답: wrong')).toBeInTheDocument()
    expect(screen.getByText('정답: commute')).toBeInTheDocument()
  })

  it('runs restart and navigation actions', async () => {
    const user = userEvent.setup()
    const { props } = renderScore()

    await user.click(screen.getByRole('button', { name: '다시 풀기' }))
    await user.click(screen.getByRole('button', { name: '오답노트' }))
    await user.click(screen.getByRole('button', { name: '단어장으로' }))

    expect(props.onRestart).toHaveBeenCalledOnce()
    expect(props.onGoToIncorrect).toHaveBeenCalledOnce()
    expect(props.onGoToStudy).toHaveBeenCalledOnce()
  })

  it('celebrates only an exact perfect score when motion is allowed', () => {
    const { unmount } = renderScore({ correctCount: 1, score: 99, incorrectAttempts: [] })
    expect(mocks.confetti).not.toHaveBeenCalled()
    unmount()

    renderScore({ correctCount: 1, score: 100, incorrectAttempts: [] })
    expect(mocks.confetti).toHaveBeenCalledOnce()
    expect(screen.getByText('모든 문제를 맞혔어요.')).toBeInTheDocument()
  })

  it('does not run confetti when reduced motion is enabled', () => {
    mocks.reducedMotion = true
    renderScore({ correctCount: 1, score: 100, incorrectAttempts: [] })
    expect(mocks.confetti).not.toHaveBeenCalled()
  })
})
