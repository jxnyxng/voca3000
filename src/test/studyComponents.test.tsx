import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FlashCard } from '../components/study/FlashCard'
import { findTargetExpression } from '../components/study/findTargetExpression'
import { StudyDeck } from '../components/study/StudyDeck'
import { WordListSheet } from '../components/study/WordListSheet'
import { VocaDatabase } from '../db'
import type { UserProgressRecord } from '../types/progress'
import type { WordItem } from '../types/word'

const words: WordItem[] = [
  {
    id: 'day01-001',
    day: 1,
    category: 'Daily Life',
    word: 'get ready',
    meaning: '준비하다',
    pronunciation: '/ɡet ˈredi/',
    partOfSpeech: 'phrase',
    exampleEn: 'I get ready before breakfast.',
    exampleKo: '나는 아침 식사 전에 준비한다.',
    acceptableAnswersKo: ['준비하다'],
    acceptableAnswersEn: ['get ready'],
  },
  {
    id: 'day01-002',
    day: 1,
    category: 'Daily Life',
    word: 'commute',
    meaning: '통근하다',
    pronunciation: '/kəˈmjuːt/',
    partOfSpeech: 'verb',
    exampleEn: 'I commute by subway.',
    exampleKo: '나는 지하철로 통근한다.',
    acceptableAnswersKo: ['통근하다'],
    acceptableAnswersEn: ['commute'],
  },
  {
    id: 'day01-003',
    day: 1,
    category: 'Daily Life',
    word: 'errand',
    meaning: '볼일',
    pronunciation: '/ˈerənd/',
    partOfSpeech: 'noun',
    exampleEn: 'I have an errand after work.',
    exampleKo: '나는 퇴근 후 볼일이 있다.',
    acceptableAnswersKo: ['볼일'],
    acceptableAnswersEn: ['errand'],
  },
]

function progressRecord(wordId: string, isMastered: boolean): UserProgressRecord {
  return {
    wordId,
    isMastered,
    correctCountKoToEn: 0,
    incorrectCountKoToEn: 0,
    correctCountEnToKo: 0,
    incorrectCountEnToKo: 0,
    lastStudiedAt: '2026-10-12T00:00:00.000Z',
  }
}

describe('findTargetExpression', () => {
  it('matches case-insensitively at phrase boundaries and skips embedded text', () => {
    expect(findTargetExpression('We GET READY now.', 'get ready')).toEqual({
      before: 'We ',
      match: 'GET READY',
      after: ' now.',
    })
    expect(findTargetExpression('The target was retargeted.', 'target')).toEqual({
      before: 'The ',
      match: 'target',
      after: ' was retargeted.',
    })
    expect(findTargetExpression('It was retargeted.', 'target')).toBeNull()
  })

  it('finds only the visible Japanese answer stem when the dictionary form is conjugated', () => {
    expect(findTargetExpression('説明を聞いて理由が分かりました。', ['分かる', 'わかる'])).toEqual({
      before: '説明を聞いて理由が',
      match: '分か',
      after: 'りました。',
    })
    expect(findTargetExpression('ゆっくり話していただけますか。', ['話す', 'はなす'])).toEqual({
      before: 'ゆっくり',
      match: '話',
      after: 'していただけますか。',
    })
  })
})

describe('FlashCard', () => {
  it('hides Korean text behind a real disclosure button', async () => {
    const user = userEvent.setup()
    function Harness() {
      const [revealed, setRevealed] = useState(false)
      return (
        <FlashCard
          word={words[0]!}
          hideDirection="korean"
          revealed={revealed}
          mastered={false}
          position={1}
          total={30}
          onReveal={() => setRevealed(true)}
          onToggleMastered={vi.fn().mockResolvedValue(true)}
        />
      )
    }
    render(<Harness />)

    expect(screen.getByRole('heading', { name: 'get ready' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'get ready 발음 듣기' })).toBeInTheDocument()
    expect(screen.queryByText('발음 듣기')).not.toBeInTheDocument()
    expect(screen.queryByText('준비하다')).not.toBeInTheDocument()
    expect(screen.getByText(`→ ${words[0]!.exampleKo}`)).toHaveClass('invisible')
    expect(screen.getByText('Day 1 · 1/30')).toBeInTheDocument()
    const reveal = screen.getByRole('button', { name: 'get ready의 한국어 뜻과 번역 공개' })
    expect(reveal).toHaveAttribute('aria-expanded', 'false')

    await user.click(reveal)
    expect(await screen.findByText('준비하다')).toBeInTheDocument()
    expect(screen.getByText(`→ ${words[0]!.exampleKo}`)).toHaveClass('visible')
    expect(screen.queryByText('정답을 공개했어요')).not.toBeInTheDocument()
  })

  it('shows Korean first and reveals the English headword in the answer box while keeping the example hidden', async () => {
    const user = userEvent.setup()
    function Harness() {
      const [revealed, setRevealed] = useState(false)
      return (
        <FlashCard
          word={words[0]!}
          hideDirection="english"
          revealed={revealed}
          mastered={false}
          position={1}
          total={30}
          onReveal={() => setRevealed(true)}
          onToggleMastered={vi.fn().mockResolvedValue(true)}
        />
      )
    }
    render(<Harness />)

    expect(screen.getByRole('heading', { name: '준비하다' })).toBeInTheDocument()
    expect(screen.getByText('get ready')).toHaveClass('bg-toss-text', 'text-transparent')
    const headwordReveal = screen.getByRole('button', { name: '준비하다의 영어 표현 공개' })
    expect(headwordReveal).toHaveTextContent('영어 표현 보기')
    expect(screen.queryByRole('button', { name: '예문 속 영어 표현 공개' })).not.toBeInTheDocument()
    expect(screen.getByText('get ready').closest('p')).toHaveTextContent('I get ready before breakfast.')
    expect(screen.queryByText(words[0]!.exampleEn)).not.toBeInTheDocument()
    expect(screen.getByText(`→ ${words[0]!.exampleKo}`)).toBeInTheDocument()

    await user.click(headwordReveal)
    expect(await screen.findAllByText('get ready')).toHaveLength(1)
    expect(screen.getByText(words[0]!.exampleEn)).toBeInTheDocument()
  })

  it('never hides the complete example when the target cannot be found', () => {
    render(
      <FlashCard
        word={{ ...words[0]!, word: 'wake up', acceptableAnswersEn: [] }}
        hideDirection="english"
        revealed={false}
        mastered={false}
        position={1}
        total={30}
        onReveal={vi.fn()}
        onToggleMastered={vi.fn().mockResolvedValue(true)}
      />,
    )

    expect(screen.queryByRole('button', { name: /예문/ })).not.toBeInTheDocument()
    expect(screen.queryByText('영어 예문 보기')).not.toBeInTheDocument()
    expect(screen.getByText(words[0]!.exampleEn)).toBeInTheDocument()
  })

  it('keeps both reveal directions on the same button dimensions', () => {
    const japaneseWord = {
      ...words[0]!,
      id: 'j0001',
      language: 'ja' as const,
      word: '準備する',
      pronunciation: '준비스루',
    }
    const sharedProps = {
      word: japaneseWord,
      revealed: false,
      mastered: false,
      position: 1,
      total: 30,
      onReveal: vi.fn(),
      onToggleMastered: vi.fn().mockResolvedValue(true),
    }
    const { rerender } = render(<FlashCard {...sharedProps} hideDirection="korean" />)
    const koreanRevealClass = screen.getByRole('button', { name: '準備する의 한국어 뜻과 번역 공개' }).className

    rerender(<FlashCard {...sharedProps} hideDirection="english" />)
    const japaneseRevealClass = screen.getByRole('button', { name: '준비하다의 일본어 표현 공개' }).className

    expect(japaneseRevealClass).toBe(koreanRevealClass)
    expect(japaneseRevealClass).toContain('h-10')
    expect(japaneseRevealClass).toContain('w-40')
  })

  it('sizes the revealed Japanese answer to its content without the extra direction label', () => {
    render(
      <FlashCard
        word={{
          ...words[0]!,
          id: 'j0001',
          language: 'ja',
          word: 'お世話になっております',
          pronunciation: '오세와니 낫테 오리마스',
        }}
        hideDirection="english"
        revealed
        mastered={false}
        position={1}
        total={30}
        onReveal={vi.fn()}
        onToggleMastered={vi.fn().mockResolvedValue(true)}
      />,
    )

    expect(screen.queryByText('일본어 표현')).not.toBeInTheDocument()
    const answerBox = screen.getByText('(오세와니 낫테 오리마스)').parentElement?.parentElement
    expect(answerBox).toHaveClass('w-fit', 'min-w-40', 'max-w-full')
    expect(answerBox).not.toHaveClass('w-40')
  })

  it('updates mastery optimistically and rolls it back with an error on failure', async () => {
    const user = userEvent.setup()
    let rejectSave: ((reason?: unknown) => void) | undefined
    const onToggleMastered = vi.fn(
      () => new Promise<boolean>((_resolve, reject) => { rejectSave = reject }),
    )
    render(
      <FlashCard
        word={words[0]!}
        hideDirection="korean"
        revealed={false}
        mastered={false}
        position={1}
        total={30}
        onReveal={vi.fn()}
        onToggleMastered={onToggleMastered}
      />,
    )

    const toggle = screen.getByRole('button', { name: '외우는 중' })
    await user.click(toggle)
    expect(screen.getByRole('button', { name: '외웠어요' })).toBeDisabled()
    rejectSave?.(new Error('DB failed'))

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('저장하지 못했어요'))
    expect(screen.getByRole('button', { name: '외우는 중' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps a successful mastery change through the controlled progress state', async () => {
    const user = userEvent.setup()
    function Harness() {
      const [mastered, setMastered] = useState(false)
      return (
        <FlashCard
          word={words[0]!}
          hideDirection="korean"
          revealed={false}
          mastered={mastered}
          position={1}
          total={30}
          onReveal={vi.fn()}
          onToggleMastered={async () => {
            setMastered((current) => !current)
            return !mastered
          }}
        />
      )
    }
    render(<Harness />)

    await user.click(screen.getByRole('button', { name: '외우는 중' }))
    await waitFor(() => expect(screen.getByRole('button', { name: '외웠어요' })).toHaveAttribute('aria-pressed', 'true'))
  })
})

describe('WordListSheet', () => {
  it('opens on the current Day and browses another Day without changing the outer selection', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const database = new VocaDatabase('WordListSheetTest')
    await database.progress.clear()
    const daySixWords = [{
      ...words[0]!,
      id: 'j0151',
      day: 6,
      language: 'ja' as const,
      word: '旅',
      meaning: '여행',
      pronunciation: '타비',
      exampleEn: '長い旅に出ます。',
      examplePronunciation: '나가이 타비니 데마스.',
    }]
    const loadWords = vi.fn().mockResolvedValue(daySixWords)
    render(
      <WordListSheet
        open
        days={[
          { day: 3, category: 'Daily Life', titleKo: '일상', wordCount: 3, dataVersion: '1', filePath: 'day03.json' },
          { day: 6, category: 'Travel & Transportation', titleKo: '여행', wordCount: 1, dataVersion: '1', filePath: 'day06.json' },
        ]}
        initialDay={3}
        initialWords={words}
        database={database}
        loadWords={loadWords}
        onClose={onClose}
      />,
    )

    const dialog = screen.getByRole('dialog', { name: '단어 리스트' })
    expect(dialog).toHaveClass('h-[calc(100dvh-2.125rem)]', 'lg:h-[calc(100dvh-4rem)]')
    expect(screen.getAllByRole('button', { name: '단어 리스트 닫기' })[0]).toHaveClass('inset-0', 'backdrop-blur-[1px]')
    const dragHeader = dialog.querySelector('[data-word-list-drag-header]')
    expect(dragHeader).toHaveClass('select-none', 'touch-pan-x', 'cursor-grab')
    expect(within(dialog).getByText('Day 03')).toBeInTheDocument()
    expect(within(dialog).queryByText('리스트 안에서 다른 Day도 확인할 수 있어요.')).not.toBeInTheDocument()
    expect(within(dialog).getByRole('option', { name: '3' })).toContainElement(
      within(dialog).getByRole('option', { name: '3' }).querySelector('[data-word-list-day-indicator]'),
    )
    expect(within(dialog).getByText('get ready')).toBeInTheDocument()
    expect(within(dialog).getByText('get ready').closest('[data-word-line]')).toHaveAttribute('data-word-line')
    expect(within(dialog).getByText('(/ɡet ˈredi/)').closest('[data-word-line]')).toBe(
      within(dialog).getByText('get ready').closest('[data-word-line]'),
    )
    expect(within(dialog).getByText('준비하다')).toHaveAttribute('data-meaning-mastery-line')
    expect(within(dialog).getAllByRole('button', { name: '외우는 중' })[0]?.parentElement).toBe(
      within(dialog).getByText('get ready').parentElement,
    )
    expect(within(dialog).queryByText(words[0]!.exampleEn)).not.toBeInTheDocument()
    expect(within(dialog).queryByText(words[0]!.exampleKo)).not.toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'get ready 예문 보기' }))
    expect(within(dialog).getByText(words[0]!.exampleEn)).toBeInTheDocument()
    expect(within(dialog).getByText(words[0]!.exampleKo)).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'get ready 예문 숨기기' })).toHaveAttribute('aria-expanded', 'true')

    await user.click(within(dialog).getAllByRole('button', { name: '외우는 중' })[0]!)
    await waitFor(() => expect(within(dialog).getByRole('button', { name: '외웠어요' })).toHaveAttribute('aria-pressed', 'true'))
    expect((await database.progress.get(words[0]!.id))?.isMastered).toBe(true)

    await user.click(within(dialog).getByRole('option', { name: '6' }))
    expect(await within(dialog).findByText('旅')).toBeInTheDocument()
    expect(within(dialog).getByText('(타비)')).toBeInTheDocument()
    expect(within(dialog).queryByText('(나가이 타비니 데마스.)')).not.toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: '旅 예문 보기' }))
    expect(within(dialog).getByText('(나가이 타비니 데마스.)')).toHaveAttribute('data-example-pronunciation')
    expect(within(dialog).getByText('(나가이 타비니 데마스.)').parentElement?.parentElement).toHaveAttribute('data-example-line')
    expect(within(dialog).getByText('Day 06')).toBeInTheDocument()
    expect(loadWords).toHaveBeenCalledWith(6)

    within(dialog).getByRole('button', { name: '단어 리스트 닫기' }).focus()
    await user.keyboard('{Enter}')
    expect(onClose).toHaveBeenCalledOnce()
    database.close()
  })

  it('searches every Day and identifies the Day and position of each result', async () => {
    const user = userEvent.setup()
    const database = new VocaDatabase('WordListSheetSearchTest')
    const dayTwoWords = [{
      ...words[0]!,
      id: 'day02-001',
      day: 2,
      word: 'journey',
      meaning: '여행',
      pronunciation: '/ˈdʒɜːrni/',
    }]
    const loadWords = vi.fn().mockResolvedValue(dayTwoWords)
    render(
      <WordListSheet
        open
        days={[
          { day: 1, category: 'Daily Life', titleKo: '일상', wordCount: 3, dataVersion: '1', filePath: 'day01.json' },
          { day: 2, category: 'Travel & Transportation', titleKo: '여행', wordCount: 1, dataVersion: '1', filePath: 'day02.json' },
        ]}
        initialDay={1}
        initialWords={words}
        database={database}
        loadWords={loadWords}
        onClose={vi.fn()}
      />,
    )

    const search = screen.getByRole('searchbox', { name: '단어 검색' })
    await user.type(search, '여행')
    expect(await screen.findByText('journey')).toBeInTheDocument()
    expect(screen.getByText('Day 02 · 1')).toBeInTheDocument()
    expect(screen.queryByText('get ready')).not.toBeInTheDocument()
    expect(loadWords).toHaveBeenCalledWith(2)

    await user.clear(search)
    await user.type(search, '없는 단어')
    expect(screen.getByText('검색 결과가 없어요.')).toBeInTheDocument()
    database.close()
  })

  it('keeps completed global-search loads cached when the query is cleared mid-request', async () => {
    const user = userEvent.setup()
    const database = new VocaDatabase('WordListSheetCancelledSearchTest')
    let resolveDayTwo: ((loadedWords: WordItem[]) => void) | undefined
    const dayTwoWords = [{
      ...words[0]!,
      id: 'day02-001',
      day: 2,
      word: 'journey',
      meaning: '여행',
    }]
    const loadWords = vi.fn(() => new Promise<WordItem[]>((resolve) => { resolveDayTwo = resolve }))
    render(
      <WordListSheet
        open
        days={[
          { day: 1, category: 'Daily Life', titleKo: '일상', wordCount: 3, dataVersion: '1', filePath: 'day01.json' },
          { day: 2, category: 'Travel & Transportation', titleKo: '여행', wordCount: 1, dataVersion: '1', filePath: 'day02.json' },
        ]}
        initialDay={1}
        initialWords={words}
        database={database}
        loadWords={loadWords}
        onClose={vi.fn()}
      />,
    )

    const search = screen.getByRole('searchbox', { name: '단어 검색' })
    await user.type(search, '여행')
    expect(screen.getByText('전체 Day에서 검색하고 있어요.')).toBeInTheDocument()
    await user.clear(search)
    resolveDayTwo?.(dayTwoWords)
    await waitFor(() => expect(loadWords).toHaveBeenCalledOnce())

    await user.type(search, '여행')
    expect(await screen.findByText('journey')).toBeInTheDocument()
    expect(loadWords).toHaveBeenCalledOnce()
    database.close()
  })

  it('closes only after a separate strong outward scroll or swipe at the top', async () => {
    const originalInnerWidth = window.innerWidth
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 })
    const onClose = vi.fn()
    const database = new VocaDatabase('WordListSheetOverscrollTest')
    const { unmount } = render(
      <WordListSheet
        open
        days={[{ day: 1, category: 'Daily Life', titleKo: '일상', wordCount: 3, dataVersion: '1', filePath: 'day01.json' }]}
        initialDay={1}
        initialWords={words}
        database={database}
        loadWords={vi.fn().mockResolvedValue(words)}
        onClose={onClose}
      />,
    )

    const scrollArea = screen.getByRole('dialog').querySelector('[data-word-list-scroll]') as HTMLDivElement
    scrollArea.scrollTop = 10
    fireEvent.wheel(scrollArea, { deltaY: -200 })
    expect(onClose).not.toHaveBeenCalled()

    scrollArea.scrollTop = 0
    fireEvent.wheel(scrollArea, { deltaY: -119 })
    expect(onClose).not.toHaveBeenCalled()
    fireEvent.wheel(scrollArea, { deltaY: -2 })
    expect(screen.getByRole('dialog')).toHaveAttribute('data-list-pull-closing', 'true')
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())

    onClose.mockClear()
    unmount()
    render(
      <WordListSheet
        open
        days={[{ day: 1, category: 'Daily Life', titleKo: '일상', wordCount: 3, dataVersion: '1', filePath: 'day01.json' }]}
        initialDay={1}
        initialWords={words}
        database={database}
        loadWords={vi.fn().mockResolvedValue(words)}
        onClose={onClose}
      />,
    )

    const touchScrollArea = screen.getByRole('dialog').querySelector('[data-word-list-scroll]') as HTMLDivElement
    touchScrollArea.scrollTop = 10
    fireEvent.touchStart(touchScrollArea, { touches: [{ clientY: 100 }] })
    touchScrollArea.scrollTop = 0
    fireEvent.touchMove(touchScrollArea, { touches: [{ clientY: 220 }] })
    fireEvent.touchEnd(touchScrollArea)
    expect(onClose).not.toHaveBeenCalled()

    fireEvent.touchStart(touchScrollArea, { touches: [{ clientY: 100 }] })
    fireEvent.touchMove(touchScrollArea, { touches: [{ clientY: 189 }] })
    expect(onClose).not.toHaveBeenCalled()
    fireEvent.touchMove(touchScrollArea, { touches: [{ clientY: 191 }] })
    expect(screen.getByRole('dialog')).toHaveAttribute('data-list-pull-closing', 'true')
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
    database.close()
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalInnerWidth })
  })

  it('does not close from list overscroll gestures on desktop', () => {
    const originalInnerWidth = window.innerWidth
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 })
    const onClose = vi.fn()
    const database = new VocaDatabase('WordListSheetDesktopOverscrollTest')
    render(
      <WordListSheet
        open
        days={[{ day: 1, category: 'Daily Life', titleKo: '일상', wordCount: 3, dataVersion: '1', filePath: 'day01.json' }]}
        initialDay={1}
        initialWords={words}
        database={database}
        loadWords={vi.fn().mockResolvedValue(words)}
        onClose={onClose}
      />,
    )

    const scrollArea = screen.getByRole('dialog').querySelector('[data-word-list-scroll]') as HTMLDivElement
    fireEvent.wheel(scrollArea, { deltaY: -500 })
    fireEvent.touchStart(scrollArea, { touches: [{ clientY: 100 }] })
    fireEvent.touchMove(scrollArea, { touches: [{ clientY: 300 }] })
    expect(onClose).not.toHaveBeenCalled()

    database.close()
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalInnerWidth })
  })
})

describe('StudyDeck', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('uses compact Ko and Jp labels and direction-specific Japanese guidance', async () => {
    const user = userEvent.setup()
    render(
      <StudyDeck
        words={[{ ...words[0]!, id: 'j0001', language: 'ja', word: 'ありがとうございます', pronunciation: '아리가토 고자이마스' }]}
        progressByWordId={new Map()}
        completedStudy={false}
        onToggleMastered={vi.fn().mockResolvedValue(true)}
        onStudyComplete={vi.fn().mockResolvedValue(undefined)}
      />,
    )

    expect(screen.getByRole('button', { name: '한국어 가리기' })).toHaveTextContent('Ko')
    expect(screen.getByRole('button', { name: '일본어 가리기' })).toHaveTextContent('Jp')
    expect(screen.getByText('(아리가토 고자이마스)')).toBeInTheDocument()
    expect(screen.getByRole('tooltip')).toHaveTextContent('일→한 테스트를 먼저 풀어보세요')

    await user.click(screen.getByRole('button', { name: '일본어 가리기' }))
    expect(screen.getByRole('tooltip')).toHaveTextContent('한→일 테스트를 먼저 풀어보세요')
  })

  it('shuffles cards on entry and reshuffles without changing the source data', async () => {
    const user = userEvent.setup()
    vi.mocked(Math.random).mockReturnValue(0)
    render(
      <StudyDeck
        words={words}
        progressByWordId={new Map()}
        completedStudy={false}
        onToggleMastered={vi.fn().mockResolvedValue(true)}
        onStudyComplete={vi.fn().mockResolvedValue(undefined)}
      />,
    )

    expect(screen.getByRole('heading', { name: 'commute' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '카드 섞기' }))
    expect(screen.getByRole('heading', { name: 'errand' })).toBeInTheDocument()
    expect(words.map(({ word }) => word)).toEqual(['get ready', 'commute', 'errand'])
  })

  it('disables the incorrect-only filter and names the quiz matching the reveal direction', async () => {
    const user = userEvent.setup()
    render(
      <StudyDeck
        words={words}
        progressByWordId={new Map()}
        completedStudy={false}
        onToggleMastered={vi.fn().mockResolvedValue(true)}
        onStudyComplete={vi.fn().mockResolvedValue(undefined)}
      />,
    )

    expect(screen.getByRole('checkbox', { name: '오답만 보기' })).toBeDisabled()
    const tooltip = screen.getByRole('tooltip')
    expect(tooltip).toHaveTextContent('아직 영→한 오답이 없어요. 영→한 테스트를 먼저 풀어보세요.')
    expect(screen.getByRole('checkbox', { name: '오답만 보기' }).closest('div')).toHaveAttribute('aria-describedby', tooltip.id)

    await user.click(screen.getByRole('button', { name: '영어 가리기' }))
    expect(screen.getByRole('tooltip')).toHaveTextContent('아직 한→영 오답이 없어요. 한→영 테스트를 먼저 풀어보세요.')
  })

  it('matches incorrect words to the active reveal direction', async () => {
    const user = userEvent.setup()
    const koToEnIncorrect = {
      ...progressRecord(words[0]!.id, false),
      lastResultKoToEn: 'incorrect' as const,
    }
    const enToKoIncorrect = {
      ...progressRecord(words[1]!.id, false),
      lastResultEnToKo: 'incorrect' as const,
    }
    render(
      <StudyDeck
        words={words}
        progressByWordId={new Map<string, UserProgressRecord>([
          [words[0]!.id, koToEnIncorrect],
          [words[1]!.id, enToKoIncorrect],
        ])}
        completedStudy={false}
        onToggleMastered={vi.fn().mockResolvedValue(true)}
        onStudyComplete={vi.fn().mockResolvedValue(undefined)}
      />,
    )

    await user.click(screen.getByRole('checkbox', { name: '오답만 보기' }))
    expect(screen.getByText('Day 1 · 1/1')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'commute' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '이전' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '다음' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: '영어 가리기' }))
    expect(screen.getByText('Day 1 · 1/1')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '준비하다' })).toBeInTheDocument()
  })

  it('combines incorrect and learning filters to exclude mastered incorrect words', async () => {
    const user = userEvent.setup()
    const masteredIncorrect = {
      ...progressRecord(words[0]!.id, true),
      lastResultEnToKo: 'incorrect' as const,
    }
    const learningIncorrect = {
      ...progressRecord(words[1]!.id, false),
      lastResultEnToKo: 'incorrect' as const,
    }
    render(
      <StudyDeck
        words={words}
        progressByWordId={new Map<string, UserProgressRecord>([
          [words[0]!.id, masteredIncorrect],
          [words[1]!.id, learningIncorrect],
        ])}
        completedStudy={false}
        onToggleMastered={vi.fn().mockResolvedValue(true)}
        onStudyComplete={vi.fn().mockResolvedValue(undefined)}
      />,
    )

    await user.click(screen.getByRole('checkbox', { name: '오답만 보기' }))
    expect(screen.getByText('Day 1 · 1/2')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'get ready' })).toBeInTheDocument()

    await user.click(screen.getByRole('checkbox', { name: '외운 단어 제외' }))
    expect(screen.getByText('Day 1 · 1/1')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'commute' })).toBeInTheDocument()
  })

  it('hides the answer again when mastering advances the learning-only deck', async () => {
    const user = userEvent.setup()

    function Harness() {
      const [progress, setProgress] = useState(new Map<string, UserProgressRecord>())
      return (
        <StudyDeck
          words={words}
          progressByWordId={progress}
          completedStudy={false}
          onToggleMastered={async (wordId) => {
            setProgress((current) => new Map(current).set(wordId, progressRecord(wordId, true)))
            return true
          }}
          onStudyComplete={vi.fn().mockResolvedValue(undefined)}
        />
      )
    }

    render(<Harness />)
    await user.click(screen.getByRole('checkbox', { name: '외운 단어 제외' }))
    await user.click(screen.getByRole('button', { name: /한국어 뜻과 번역 공개/ }))
    await user.click(screen.getByRole('button', { name: '외우는 중' }))

    expect(await screen.findByRole('button', { name: /한국어 뜻과 번역 공개/ })).toBeInTheDocument()
    expect(screen.queryByText('정답을 공개했어요')).not.toBeInTheDocument()
  })

  it('moves the shared pill indicator between hide directions', async () => {
    const user = userEvent.setup()
    render(
      <StudyDeck
        words={words}
        progressByWordId={new Map()}
        completedStudy={false}
        onToggleMastered={vi.fn().mockResolvedValue(true)}
        onStudyComplete={vi.fn().mockResolvedValue(undefined)}
      />,
    )

    const korean = screen.getByRole('button', { name: '한국어 가리기' })
    const english = screen.getByRole('button', { name: '영어 가리기' })
    expect(korean.querySelector('[data-pill-indicator]')).toBeInTheDocument()
    expect(english.querySelector('[data-pill-indicator]')).not.toBeInTheDocument()

    await user.click(english)
    expect(korean.querySelector('[data-pill-indicator]')).not.toBeInTheDocument()
    expect(english.querySelector('[data-pill-indicator]')).toBeInTheDocument()
  })

  it('navigates explicitly and saves completion once after every card is visited', async () => {
    const user = userEvent.setup()
    const onStudyComplete = vi.fn().mockResolvedValue(undefined)
    render(
      <StudyDeck
        words={words}
        progressByWordId={new Map([[words[0]!.id, progressRecord(words[0]!.id, true)]])}
        completedStudy={false}
        onToggleMastered={vi.fn().mockResolvedValue(false)}
        onStudyComplete={onStudyComplete}
      />,
    )

    expect(screen.getByText('Day 1 · 1/3')).toBeInTheDocument()
    expect(screen.queryByText(/열람 \d+개/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '외웠어요' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: '다음' }))
    expect(screen.getByText('Day 1 · 2/3')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '다음' }))

    await waitFor(() => expect(onStudyComplete).toHaveBeenCalledTimes(1))
    await user.click(screen.getByRole('button', { name: '이전' }))
    await user.click(screen.getByRole('button', { name: '다음' }))
    expect(onStudyComplete).toHaveBeenCalledTimes(1)
  })

  it('supports arrow-key navigation when the deck itself has focus', async () => {
    const user = userEvent.setup()
    render(
      <StudyDeck
        words={words}
        progressByWordId={new Map()}
        completedStudy={false}
        onToggleMastered={vi.fn().mockResolvedValue(true)}
        onStudyComplete={vi.fn().mockResolvedValue(undefined)}
      />,
    )
    const deck = screen.getByRole('region', { name: '단어 학습 카드' })
    expect(deck).not.toHaveClass('outline-none')
    deck.focus()

    await user.keyboard('{ArrowRight}')
    expect(screen.getByText('Day 1 · 2/3')).toBeInTheDocument()
    await user.keyboard('{ArrowLeft}')
    expect(screen.getByText('Day 1 · 1/3')).toBeInTheDocument()
  })

  it('supports horizontal touch swipes without treating vertical scrolling as navigation', () => {
    render(
      <StudyDeck
        words={words}
        progressByWordId={new Map()}
        completedStudy={false}
        onToggleMastered={vi.fn().mockResolvedValue(true)}
        onStudyComplete={vi.fn().mockResolvedValue(undefined)}
      />,
    )
    const deck = screen.getByRole('region', { name: '단어 학습 카드' })

    fireEvent.touchStart(deck, { touches: [{ clientX: 250, clientY: 100 }] })
    fireEvent.touchEnd(deck, { changedTouches: [{ clientX: 150, clientY: 112 }] })
    expect(screen.getByText('Day 1 · 2/3')).toBeInTheDocument()

    fireEvent.touchStart(deck, { touches: [{ clientX: 150, clientY: 100 }] })
    fireEvent.touchEnd(deck, { changedTouches: [{ clientX: 158, clientY: 190 }] })
    expect(screen.getByText('Day 1 · 2/3')).toBeInTheDocument()

    fireEvent.touchStart(deck, { touches: [{ clientX: 150, clientY: 100 }] })
    fireEvent.touchEnd(deck, { changedTouches: [{ clientX: 245, clientY: 108 }] })
    expect(screen.getByText('Day 1 · 1/3')).toBeInTheDocument()
  })

  it('shows a retry action when completion persistence fails', async () => {
    const user = userEvent.setup()
    const onStudyComplete = vi.fn()
      .mockRejectedValueOnce(new Error('DB failed'))
      .mockResolvedValueOnce(undefined)
    render(
      <StudyDeck
        words={words}
        progressByWordId={new Map()}
        completedStudy={false}
        onToggleMastered={vi.fn().mockResolvedValue(true)}
        onStudyComplete={onStudyComplete}
      />,
    )

    await user.click(screen.getByRole('button', { name: '다음' }))
    await user.click(screen.getByRole('button', { name: '다음' }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('완료 상태를 저장하지 못했어요'))
    await user.click(screen.getByRole('button', { name: '완료 저장 다시 시도' }))
    await waitFor(() => expect(onStudyComplete).toHaveBeenCalledTimes(2))
  })
})
