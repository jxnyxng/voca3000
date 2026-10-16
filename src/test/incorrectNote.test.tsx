import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { IncorrectNote } from '../components/quiz/IncorrectNote'
import { deleteDatabase, recordQuizResult, VocaDatabase } from '../db'
import type { WordItem } from '../types/word'

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

class MockUtterance {
  readonly text: string
  lang = ''
  rate = 1
  voice: SpeechSynthesisVoice | null = null
  onstart: (() => void) | null = null
  onend: (() => void) | null = null
  onerror: (() => void) | null = null

  constructor(text: string) {
    this.text = text
  }
}

let database: VocaDatabase
let databaseNumber = 0

beforeEach(() => {
  databaseNumber += 1
  database = new VocaDatabase(`Voca3000IncorrectNoteTestDB-${databaseNumber}`)
})

afterEach(async () => {
  Reflect.deleteProperty(window, 'speechSynthesis')
  Reflect.deleteProperty(globalThis, 'SpeechSynthesisUtterance')
  await deleteDatabase(database)
})

async function seedIncorrectProgress() {
  await recordQuizResult('w0001', 'ko-to-en', false, database)
  await recordQuizResult('w0001', 'ko-to-en', false, database)
  await recordQuizResult('w0001', 'en-to-ko', true, database)
  await recordQuizResult('w0002', 'en-to-ko', false, database)
}

describe('IncorrectNote', () => {
  it('uses Japanese direction labels for Japanese words', () => {
    render(<IncorrectNote words={[{ ...words[0]!, language: 'ja' }]} database={database} />)

    expect(screen.getByRole('button', { name: '한→일' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '일→한' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '한→영' })).not.toBeInTheDocument()
  })

  it('shows a positive empty state without incorrect results', async () => {
    render(<IncorrectNote words={words} database={database} />)
    expect(await screen.findByRole('heading', { name: '최근 오답이 없어요' })).toBeInTheDocument()
  })

  it('filters recent incorrect directions and preserves cumulative counts', async () => {
    const user = userEvent.setup()
    await seedIncorrectProgress()
    render(<IncorrectNote words={words} database={database} />)

    expect(await screen.findByText('commute')).toBeInTheDocument()
    expect(screen.getByText('errand')).toBeInTheDocument()
    expect(screen.getByText('누적 오답 2회')).toBeInTheDocument()
    expect(screen.getByText('최근 오답 · 한→영')).toBeInTheDocument()
    expect(screen.getByText('최근 오답 · 영→한')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '전체' }).querySelector('[data-pill-indicator]')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '한→영' }))
    expect(screen.getByRole('button', { name: '전체' }).querySelector('[data-pill-indicator]')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '한→영' }).querySelector('[data-pill-indicator]')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText('errand')).not.toBeInTheDocument())
    expect(screen.getByText('commute')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '영→한' }))
    expect(await screen.findByText('errand')).toBeInTheDocument()
    expect(screen.queryByText('commute')).not.toBeInTheDocument()
  })

  it('reactively removes a recent mistake after a correct result in the same mode', async () => {
    const user = userEvent.setup()
    await recordQuizResult('w0001', 'ko-to-en', false, database)
    render(<IncorrectNote words={words} database={database} />)
    await user.click(screen.getByRole('button', { name: '한→영' }))
    expect(await screen.findByText('commute')).toBeInTheDocument()

    await recordQuizResult('w0001', 'ko-to-en', true, database)
    expect(await screen.findByRole('heading', { name: '최근 오답이 없어요' })).toBeInTheDocument()
  })

  it('plays the selected word pronunciation', async () => {
    const user = userEvent.setup()
    const speak = vi.fn()
    const synthesis = {
      cancel: vi.fn(),
      speak,
      getVoices: vi.fn(() => []),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: synthesis })
    Object.defineProperty(globalThis, 'SpeechSynthesisUtterance', { configurable: true, value: MockUtterance })
    await recordQuizResult('w0001', 'ko-to-en', false, database)
    render(<IncorrectNote words={words} database={database} />)

    await user.click(await screen.findByRole('button', { name: 'commute 발음 듣기' }))
    expect(speak).toHaveBeenCalledOnce()
    expect((speak.mock.calls[0]![0] as MockUtterance).text).toBe('commute')
  })
})
