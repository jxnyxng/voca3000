import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { IncorrectNote } from '../components/quiz/IncorrectNote'
import { deleteDatabase, recordQuizResult, VocaDatabase } from '../db'
import { builtinContentId } from '../types/content'
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
const CONTENT_ID = builtinContentId('en', 1)

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
  await recordQuizResult(CONTENT_ID, 'w0001', 'ko-to-en', false, database)
  await recordQuizResult(CONTENT_ID, 'w0001', 'ko-to-en', false, database)
  await recordQuizResult(CONTENT_ID, 'w0001', 'en-to-ko', true, database)
  await recordQuizResult(CONTENT_ID, 'w0002', 'en-to-ko', false, database)
}

describe('IncorrectNote', () => {
  it('uses the parent direction selection without a second local selector', () => {
    render(<IncorrectNote words={[{ ...words[0]!, language: 'ja' }]} database={database} />)
    expect(screen.queryByRole('group', { name: '오답 방향 필터' })).not.toBeInTheDocument()
  })

  it('shows a positive empty state without incorrect results', async () => {
    render(<IncorrectNote words={words} database={database} />)
    expect(await screen.findByRole('heading', { name: '최근 오답이 없어요' })).toBeInTheDocument()
  })

  it('filters recent incorrect directions and preserves cumulative counts', async () => {
    await seedIncorrectProgress()
    const { rerender } = render(<IncorrectNote words={words} database={database} direction="ko-to-en" />)

    expect(await screen.findByText('commute')).toBeInTheDocument()
    expect(screen.queryByText('errand')).not.toBeInTheDocument()
    expect(screen.getByText('누적 오답 2회')).toBeInTheDocument()
    expect(screen.getByText('최근 오답 · 한→영')).toBeInTheDocument()

    rerender(<IncorrectNote words={words} database={database} direction="en-to-ko" />)
    expect(await screen.findByText('errand')).toBeInTheDocument()
    expect(screen.queryByText('commute')).not.toBeInTheDocument()
  })

  it('reactively removes a recent mistake after a correct result in the same mode', async () => {
    await recordQuizResult(CONTENT_ID, 'w0001', 'ko-to-en', false, database)
    render(<IncorrectNote words={words} database={database} />)
    expect(await screen.findByText('commute')).toBeInTheDocument()

    await recordQuizResult(CONTENT_ID, 'w0001', 'ko-to-en', true, database)
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
    await recordQuizResult(CONTENT_ID, 'w0001', 'ko-to-en', false, database)
    render(<IncorrectNote words={words} database={database} />)

    await user.click(await screen.findByRole('button', { name: 'commute 발음 듣기' }))
    expect(speak).toHaveBeenCalledOnce()
    expect((speak.mock.calls[0]![0] as MockUtterance).text).toBe('commute')
  })
})
