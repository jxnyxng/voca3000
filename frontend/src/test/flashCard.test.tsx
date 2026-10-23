import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { FlashCard } from '../components/study/FlashCard'
import { studyWords as words } from './fixtures/study'

describe('FlashCard', () => {
  it('uses the same card border as the other surfaces', () => {
    render(
      <FlashCard
        word={words[0]!}
        hideDirection="korean"
        revealed={false}
        mastered={false}
        position={1}
        total={30}
        onReveal={vi.fn()}
        onToggleMastered={vi.fn().mockResolvedValue(true)}
      />,
    )

    expect(screen.getByRole('article', { name: '준비하다 학습 카드' })).toHaveClass('border', 'border-toss-border')
  })

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

  it('reveals the Japanese example pronunciation with the Japanese expression', async () => {
    const user = userEvent.setup()
    const japaneseWord = {
      ...words[0]!,
      id: 'j0001',
      language: 'ja' as const,
      word: '準備する',
      pronunciation: '준비스루',
      exampleEn: '朝食の前に準備する。',
      examplePronunciation: '초-식노 마에니 준비스루。',
    }

    function Harness() {
      const [revealed, setRevealed] = useState(false)
      return (
        <FlashCard
          word={japaneseWord}
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

    const examplePronunciation = screen.getByText(`(${japaneseWord.examplePronunciation})`)
    expect(examplePronunciation).toHaveClass('invisible')
    expect(examplePronunciation).toHaveAttribute('aria-hidden', 'true')

    await user.click(screen.getByRole('button', { name: '준비하다의 일본어 표현 공개' }))

    expect(await screen.findByText(`(${japaneseWord.examplePronunciation})`)).toHaveClass('visible')
    expect(examplePronunciation).toHaveAttribute('aria-hidden', 'false')
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
