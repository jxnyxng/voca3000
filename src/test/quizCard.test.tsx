import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { QuizCard } from '../components/quiz/QuizCard'
import { deleteDatabase, VocaDatabase } from '../db'
import type { WordItem } from '../types/word'

vi.mock('canvas-confetti', () => ({ default: vi.fn() }))

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
  {
    id: 'w0002',
    day: 1,
    category: 'Daily Life',
    word: 'errand',
    meaning: '볼일',
    pronunciation: '/ˈerənd/',
    partOfSpeech: 'noun',
    exampleEn: 'I need to run an errand.',
    exampleKo: '나는 볼일을 봐야 한다.',
    acceptableAnswersKo: ['심부름'],
    acceptableAnswersEn: [],
  },
]

let database: VocaDatabase
let databaseNumber = 0

beforeEach(() => {
  databaseNumber += 1
  database = new VocaDatabase(`Voca3000QuizCardTestDB-${databaseNumber}`)
})

afterEach(async () => {
  vi.restoreAllMocks()
  await deleteDatabase(database)
})

function renderQuiz(mode: 'ko-to-en' | 'en-to-ko' = 'ko-to-en') {
  return render(
    <QuizCard
      words={words}
      day={1}
      mode={mode}
      database={database}
      correctFeedbackDelayMs={5}
      incorrectFeedbackDelayMs={5}
    />,
  )
}

describe('QuizCard', () => {
  it('shows the correct prompt for each quiz direction', () => {
    const { unmount } = renderQuiz('ko-to-en')
    expect(screen.getByText('출퇴근하다')).toBeInTheDocument()
    expect(screen.getByText('영어 표현을 입력하세요')).toBeInTheDocument()
    unmount()

    renderQuiz('en-to-ko')
    expect(screen.getByText('commute')).toBeInTheDocument()
    expect(screen.getByText('한국어 뜻을 입력하세요')).toBeInTheDocument()
  })

  it('keeps an empty answer in place and announces guidance', async () => {
    const user = userEvent.setup()
    renderQuiz()
    await user.click(screen.getByRole('button', { name: '정답 확인' }))

    expect(screen.getByRole('alert')).toHaveTextContent('답안을 입력해 주세요')
    expect(screen.getByLabelText('내 답안')).toBeEnabled()
    expect(await database.progress.count()).toBe(0)
  })

  it('does not submit Enter while an IME composition is active', async () => {
    const user = userEvent.setup()
    renderQuiz('en-to-ko')
    const input = screen.getByLabelText('내 답안')
    await user.click(input)
    fireEvent.compositionStart(input)
    await user.keyboard('출퇴근하다{Enter}')

    expect(screen.getByRole('button', { name: '정답 확인' })).toBeInTheDocument()
    expect(await database.progress.count()).toBe(0)
    fireEvent.compositionEnd(input)
  })

  it('locks during evaluation and advances after correct feedback', async () => {
    const user = userEvent.setup()
    renderQuiz()
    await user.type(screen.getByLabelText('내 답안'), 'commute')
    await user.click(screen.getByRole('button', { name: '정답 확인' }))

    expect(screen.getByLabelText('내 답안')).toBeDisabled()
    await waitFor(() => expect(screen.getByText('볼일')).toBeInTheDocument())
    await waitFor(() => {
      expect(screen.getByLabelText('내 답안')).toHaveValue('')
      expect(screen.getByLabelText('내 답안')).toHaveFocus()
    })
    expect((await database.progress.get('w0001'))?.correctCountKoToEn).toBe(1)
  })

  it('reveals an incorrect answer and waits for confirmation before focusing the next input', async () => {
    const user = userEvent.setup()
    renderQuiz()
    await user.type(screen.getByLabelText('내 답안'), 'wrong')
    await user.click(screen.getByRole('button', { name: '정답 확인' }))

    expect(await screen.findByText(/정답은 commute입니다/)).toBeInTheDocument()
    expect(screen.queryByText('볼일')).not.toBeInTheDocument()
    const confirm = await screen.findByRole('button', { name: '확인하고 다음 문제' })
    expect(screen.queryByText('볼일')).not.toBeInTheDocument()
    await user.click(confirm)

    expect(screen.getByText('볼일')).toBeInTheDocument()
    expect(screen.getByLabelText('내 답안')).toHaveFocus()
  })

  it('shows the completed score and supports restart and tab navigation', async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()
    render(
      <QuizCard
        words={[words[0]!]}
        day={1}
        mode="ko-to-en"
        database={database}
        correctFeedbackDelayMs={5}
        onNavigate={onNavigate}
      />,
    )
    await user.type(screen.getByLabelText('내 답안'), 'commute')
    await user.click(screen.getByRole('button', { name: '정답 확인' }))

    expect(await screen.findByRole('heading', { name: '퀴즈 완료' })).toBeInTheDocument()
    expect(screen.getByText('100점')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '오답노트' }))
    await user.click(screen.getByRole('button', { name: '학습으로' }))
    expect(onNavigate).toHaveBeenNthCalledWith(1, 'incorrect')
    expect(onNavigate).toHaveBeenNthCalledWith(2, 'study')

    await user.click(screen.getByRole('button', { name: '다시 풀기' }))
    expect(screen.getByRole('button', { name: '정답 확인' })).toBeInTheDocument()
    expect(screen.getByLabelText('내 답안')).toHaveValue('')
  })
})
