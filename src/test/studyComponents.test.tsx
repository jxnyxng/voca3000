import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { FlashCard } from '../components/study/FlashCard'
import { findTargetExpression } from '../components/study/findTargetExpression'
import { StudyDeck } from '../components/study/StudyDeck'
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
          onReveal={() => setRevealed(true)}
          onToggleMastered={vi.fn().mockResolvedValue(true)}
        />
      )
    }
    render(<Harness />)

    expect(screen.getByRole('heading', { name: 'get ready' })).toBeInTheDocument()
    expect(screen.queryByText('준비하다')).not.toBeInTheDocument()
    expect(screen.queryByText(words[0]!.exampleKo)).not.toBeInTheDocument()
    const reveal = screen.getByRole('button', { name: 'get ready의 한국어 뜻과 번역 공개' })
    expect(reveal).toHaveAttribute('aria-expanded', 'false')

    await user.click(reveal)
    expect(screen.getByText('준비하다')).toBeInTheDocument()
    expect(screen.getByText(words[0]!.exampleKo)).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('정답을 공개했어요')
  })

  it('hides the English headword and only the target phrase in its example', async () => {
    const user = userEvent.setup()
    function Harness() {
      const [revealed, setRevealed] = useState(false)
      return (
        <FlashCard
          word={words[0]!}
          hideDirection="english"
          revealed={revealed}
          mastered={false}
          onReveal={() => setRevealed(true)}
          onToggleMastered={vi.fn().mockResolvedValue(true)}
        />
      )
    }
    render(<Harness />)

    expect(screen.queryByRole('heading', { name: 'get ready' })).not.toBeInTheDocument()
    expect(screen.getByText('준비하다')).toBeInTheDocument()
    const exampleReveal = screen.getByRole('button', { name: '예문 속 영어 표현 공개' })
    expect(exampleReveal.closest('p')).toHaveTextContent('I 가려진 영어 표현 before breakfast.')
    expect(exampleReveal.closest('p')).not.toHaveTextContent('get ready')
    expect(screen.queryByText(words[0]!.exampleEn)).not.toBeInTheDocument()

    await user.click(exampleReveal)
    expect(screen.getByRole('heading', { name: 'get ready' })).toBeInTheDocument()
    expect(screen.getByText(words[0]!.exampleEn)).toBeInTheDocument()
  })

  it('falls back to hiding the whole English example when the target cannot be found', () => {
    render(
      <FlashCard
        word={{ ...words[0]!, word: 'wake up' }}
        hideDirection="english"
        revealed={false}
        mastered={false}
        onReveal={vi.fn()}
        onToggleMastered={vi.fn().mockResolvedValue(true)}
      />,
    )

    expect(screen.getByRole('button', { name: '영어 예문 공개' })).toBeInTheDocument()
    expect(screen.queryByText(words[0]!.exampleEn)).not.toBeInTheDocument()
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

describe('StudyDeck', () => {
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

    expect(screen.getByText('1 / 3')).toHaveTextContent('열람 1개')
    expect(screen.getByRole('button', { name: '외웠어요' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: '다음' }))
    expect(screen.getByText('2 / 3')).toHaveTextContent('열람 2개')
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
    deck.focus()

    await user.keyboard('{ArrowRight}')
    expect(screen.getByText('2 / 3')).toBeInTheDocument()
    await user.keyboard('{ArrowLeft}')
    expect(screen.getByText('1 / 3')).toBeInTheDocument()
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
