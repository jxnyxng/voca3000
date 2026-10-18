import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { WordListSheet } from '../components/study/WordListSheet'
import { VocaDatabase } from '../db'
import type { WordItem } from '../types/word'
import { studyWords as words } from './fixtures/study'

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
    expect(within(dialog).getByText('(나가이 타비니 데마스.)').closest('[data-example-line]')).toHaveAttribute('data-example-line')
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
