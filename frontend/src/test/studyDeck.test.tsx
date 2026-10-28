import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { StudyDeck } from '../components/study/StudyDeck'
import { studyWords, createProgressRecord } from './fixtures/study'
import type { UserProgressRecord } from '../types/progress'
import type { QuizMode } from '../types/word'

const words = studyWords

function Deck({ progress = new Map<string, UserProgressRecord>(), onToggleFavorite = vi.fn().mockResolvedValue(true), direction = 'ko-to-en' }: {
  progress?: Map<string, UserProgressRecord>
  onToggleFavorite?: (wordId: string) => Promise<boolean>
  direction?: QuizMode
}) {
  return <StudyDeck words={words} progressByWordId={progress} completedStudy={false} direction={direction}
    onToggleMastered={vi.fn().mockResolvedValue(true)} onToggleFavorite={onToggleFavorite}
    onStudyComplete={vi.fn().mockResolvedValue(undefined)} />
}

describe('StudyDeck', () => {
  beforeEach(() => vi.spyOn(Math, 'random').mockReturnValue(0))
  afterEach(() => vi.restoreAllMocks())

  it('shows all four exclusive filters and includes mastered words in 전체', async () => {
    const user = userEvent.setup()
    const progress = new Map([[words[0]!.id, createProgressRecord(words[0]!.id, true)]])
    render(<Deck progress={progress} />)
    const allTab = screen.getByRole('tab', { name: '전체' })
    expect(allTab).toHaveAttribute('aria-selected', 'true')
    expect(allTab).toHaveClass('rounded-full')
    expect(allTab.querySelector('[data-pill-indicator]')).toHaveClass('bg-toss-blue')
    expect(screen.getByText('Day 1 · 1/3')).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: '외우는중' }))
    expect(allTab.querySelector('[data-pill-indicator]')).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '외우는중' }).querySelector('[data-pill-indicator]')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('Day 1 · 1/2')).toBeInTheDocument())
  })

  it('filters incorrect words for the selected reveal direction', async () => {
    const user = userEvent.setup()
    const progress = new Map<string, UserProgressRecord>([
      [words[0]!.id, { ...createProgressRecord(words[0]!.id, false), lastResultKoToEn: 'incorrect' }],
      [words[1]!.id, { ...createProgressRecord(words[1]!.id, false), lastResultEnToKo: 'incorrect' }],
    ])
    const { rerender } = render(<Deck progress={progress} direction="ko-to-en" />)
    await user.click(screen.getByRole('tab', { name: '오답단어' }))
    await waitFor(() => expect(screen.getByText('Day 1 · 1/1')).toBeInTheDocument())
    expect(screen.getByRole('heading', { name: '준비하다' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '영어 가리기' })).not.toBeInTheDocument()
    rerender(<Deck progress={progress} direction="en-to-ko" />)
    expect(screen.getByRole('heading', { name: '준비하다' })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('heading', { name: 'commute' })).toBeInTheDocument())
  })

  it('saves a star and shows only favorites when selected', async () => {
    const user = userEvent.setup()
    function Harness() {
      const [progress, setProgress] = useState(new Map<string, UserProgressRecord>())
      return <StudyDeck words={words} progressByWordId={progress} completedStudy={false}
        onToggleMastered={vi.fn().mockResolvedValue(true)}
        onToggleFavorite={async (id) => {
          setProgress((current) => new Map(current).set(id, { ...createProgressRecord(id, false), isFavorite: true }))
          return true
        }}
        onStudyComplete={vi.fn().mockResolvedValue(undefined)} />
    }
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: '즐겨찾기 추가' }))
    await waitFor(() => expect(screen.getByRole('button', { name: '즐겨찾기 해제' })).toHaveAttribute('aria-pressed', 'true'))
    await user.click(screen.getByRole('tab', { name: '즐겨찾기' }))
    expect(screen.getByText('Day 1 · 1/1')).toBeInTheDocument()
  })

  it('shows an empty state for a filter with no matching words', async () => {
    const user = userEvent.setup()
    render(<Deck />)
    await user.click(screen.getByRole('tab', { name: '즐겨찾기' }))
    expect(screen.getByText('조건에 맞는 단어가 없어요')).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: '전체' }))
    expect(screen.getByText('Day 1 · 1/3')).toBeInTheDocument()
  })

  it('places a full-width shuffle below the card on small screens and keeps the desktop side control', async () => {
    const user = userEvent.setup()
    render(<Deck direction="en-to-ko" />)
    const shuffle = screen.getByRole('button', { name: '카드 섞기' })
    const card = screen.getByRole('article', { name: /학습 카드/ })
    expect(shuffle).toHaveClass('w-full', 'rounded-toss-button', 'lg:w-10', 'lg:self-stretch', 'lg:rounded-toss-card')
    expect(shuffle.parentElement).toHaveClass('flex-col-reverse', 'lg:flex-row')
    expect(shuffle).toHaveTextContent('카드 섞기')
    expect(shuffle.querySelector('svg')).toBeInTheDocument()
    expect(shuffle.parentElement).toBe(card.parentElement?.parentElement)
    expect(screen.getByRole('heading', { name: 'commute' })).toBeInTheDocument()

    await user.click(shuffle)
    await waitFor(() => expect(screen.getByRole('heading', { name: 'errand' })).toBeInTheDocument(), { timeout: 3000 })
  })

  it('navigates cards by arrow keys and touch swipe', async () => {
    const user = userEvent.setup()
    render(<Deck />)
    const deck = screen.getByRole('region', { name: '단어 학습 카드' })
    deck.focus()
    await user.keyboard('{ArrowRight}')
    await waitFor(() => expect(screen.getByText('Day 1 · 2/3')).toBeInTheDocument())
    fireEvent.touchStart(deck, { touches: [{ clientX: 150, clientY: 100 }] })
    fireEvent.touchEnd(deck, { changedTouches: [{ clientX: 245, clientY: 108 }] })
    await waitFor(() => expect(screen.getByText('Day 1 · 1/3')).toBeInTheDocument())
  })
})
