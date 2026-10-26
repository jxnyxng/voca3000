import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { StudyDeck } from '../components/study/StudyDeck'
import type { UserProgressRecord } from '../types/progress'
import { createProgressRecord as progressRecord, studyWords as words } from './fixtures/study'

vi.mock('../components/study/MasteryStatusIcon', () => ({
  MasteryStatusIcon: ({ onMasteredAnimationComplete }: { onMasteredAnimationComplete?: () => void }) => (
    <svg data-testid="mastery-animation" onClick={onMasteredAnimationComplete} />
  ),
}))

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
    expect(await screen.findByRole('heading', { name: 'errand' })).toBeInTheDocument()
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
    expect(screen.getByText('Day 1 · 1/1')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'commute' })).toBeInTheDocument()

    await user.click(screen.getByRole('checkbox', { name: '외운 단어 제외' }))
    expect(screen.getByText('Day 1 · 1/2')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'get ready' })).toBeInTheDocument()
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
    expect(screen.getByRole('checkbox', { name: '외운 단어 제외' })).toBeChecked()
    const firstWord = screen.getByRole('heading', { level: 2 }).textContent
    await user.click(screen.getByRole('button', { name: /한국어 뜻과 번역 공개/ }))
    await user.click(screen.getByRole('button', { name: '외우는 중' }))

    expect(screen.getByRole('button', { name: '외웠어요' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(firstWord!)
    expect(screen.getByRole('button', { name: '다음' })).toBeDisabled()
    fireEvent.click(screen.getByTestId('mastery-animation'))
    expect(await screen.findByRole('button', { name: /한국어 뜻과 번역 공개/ })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('heading', { level: 2 })).not.toHaveTextContent(firstWord!))
    expect(screen.queryByText('정답을 공개했어요')).not.toBeInTheDocument()
  })

  it('waits for both the check animation and the save before leaving the card', async () => {
    const user = userEvent.setup()
    let finishSave!: (value: boolean) => void
    const save = new Promise<boolean>((resolve) => { finishSave = resolve })

    function Harness() {
      const [progress, setProgress] = useState(new Map<string, UserProgressRecord>())
      return <StudyDeck
        words={words}
        progressByWordId={progress}
        completedStudy={false}
        onToggleMastered={async (wordId) => {
          const result = await save
          setProgress((current) => new Map(current).set(wordId, progressRecord(wordId, true)))
          return result
        }}
        onStudyComplete={vi.fn().mockResolvedValue(undefined)}
      />
    }

    render(<Harness />)
    const firstWord = screen.getByRole('heading', { level: 2 }).textContent
    await user.click(screen.getByRole('button', { name: '외우는 중' }))
    fireEvent.click(screen.getByTestId('mastery-animation'))
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(firstWord!)

    finishSave(true)
    await waitFor(() => expect(screen.getByRole('heading', { level: 2 })).not.toHaveTextContent(firstWord!))
  })

  it('keeps the card when saving mastery fails', async () => {
    const user = userEvent.setup()
    render(<StudyDeck
      words={words}
      progressByWordId={new Map()}
      completedStudy={false}
      onToggleMastered={vi.fn().mockRejectedValue(new Error('DB failed'))}
      onStudyComplete={vi.fn().mockResolvedValue(undefined)}
    />)

    const firstWord = screen.getByRole('heading', { level: 2 }).textContent
    await user.click(screen.getByRole('button', { name: '외우는 중' }))
    fireEvent.click(screen.getByTestId('mastery-animation'))

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(firstWord!)
    expect(await screen.findByRole('alert')).toHaveTextContent('암기 상태를 저장하지 못했어요')
    expect(screen.getByRole('button', { name: '외우는 중' })).toBeEnabled()
  })

  it('shows an empty deck after mastering the final learning word and lets the filter be cleared', async () => {
    const user = userEvent.setup()

    function Harness() {
      const [progress, setProgress] = useState(new Map<string, UserProgressRecord>())
      return <StudyDeck
        words={[words[0]!]}
        progressByWordId={progress}
        completedStudy={false}
        onToggleMastered={async (wordId) => {
          setProgress((current) => new Map(current).set(wordId, progressRecord(wordId, true)))
          return true
        }}
        onStudyComplete={vi.fn().mockResolvedValue(undefined)}
      />
    }

    render(<Harness />)
    await user.click(screen.getByRole('button', { name: '외우는 중' }))
    fireEvent.click(screen.getByTestId('mastery-animation'))
    expect(await screen.findByText('조건에 맞는 단어가 없어요')).toBeInTheDocument()

    await user.click(screen.getByRole('checkbox', { name: '외운 단어 제외' }))
    expect(screen.getByRole('heading', { name: 'get ready' })).toBeInTheDocument()
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

    expect(screen.getByRole('checkbox', { name: '외운 단어 제외' })).toBeChecked()
    await user.click(screen.getByRole('checkbox', { name: '외운 단어 제외' }))
    expect(screen.getByText('Day 1 · 1/3')).toBeInTheDocument()
    expect(screen.queryByText(/열람 \d+개/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '외웠어요' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: '다음' }))
    expect(await screen.findByText('Day 1 · 2/3')).toBeInTheDocument()
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
    expect(await screen.findByText('Day 1 · 2/3')).toBeInTheDocument()
    await user.keyboard('{ArrowLeft}')
    await waitFor(() => expect(screen.getAllByText('Day 1 · 1/3')).toHaveLength(1))
  })

  it('supports horizontal touch swipes without treating vertical scrolling as navigation', async () => {
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
    expect(await screen.findByText('Day 1 · 2/3')).toBeInTheDocument()

    fireEvent.touchStart(deck, { touches: [{ clientX: 150, clientY: 100 }] })
    fireEvent.touchEnd(deck, { changedTouches: [{ clientX: 158, clientY: 190 }] })
    expect(screen.getByText('Day 1 · 2/3')).toBeInTheDocument()

    fireEvent.touchStart(deck, { touches: [{ clientX: 150, clientY: 100 }] })
    fireEvent.touchEnd(deck, { changedTouches: [{ clientX: 245, clientY: 108 }] })
    await waitFor(() => expect(screen.getAllByText('Day 1 · 1/3')).toHaveLength(1))
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
