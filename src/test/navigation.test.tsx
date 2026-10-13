import { act, render, renderHook, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppTabs } from '../components/common/AppTabs'
import { DaySelector } from '../components/day/DaySelector'
import { useDaySelection } from '../hooks/useDaySelection'
import type { AppTab } from '../types/navigation'
import type { DayIndexItem } from '../types/word'

const days: DayIndexItem[] = [
  {
    day: 1,
    category: 'Daily Life',
    titleKo: '일상과 루틴',
    wordCount: 30,
    dataVersion: '1.0.0',
    filePath: 'data/words-day01.json',
  },
  {
    day: 3,
    category: 'Leisure & Hobbies',
    titleKo: '여가와 취미',
    wordCount: 30,
    dataVersion: '1.0.0',
    filePath: 'data/words-day03.json',
  },
  {
    day: 8,
    category: 'Work & Campus',
    titleKo: '업무와 학교',
    wordCount: 30,
    dataVersion: '1.0.0',
    filePath: 'data/words-day08.json',
  },
]

beforeEach(() => {
  window.localStorage.clear()
})

describe('DaySelector', () => {
  function DayHarness() {
    const [selectedDay, setSelectedDay] = useState(1)
    return (
      <DaySelector
        days={days}
        selectedDay={selectedDay}
        completedDays={new Set([1])}
        onSelectDay={setSelectedDay}
      />
    )
  }

  it('renders only supplied Days and exposes completion in the accessible name', () => {
    render(<DayHarness />)

    expect(screen.getByRole('listbox', { name: '학습 Day 선택' })).toHaveAttribute('aria-orientation', 'vertical')
    expect(screen.getAllByRole('option')).toHaveLength(3)
    expect(screen.getByRole('option', { name: 'Day 1, 일상과 루틴, 완료' })).toHaveTextContent('1')
    expect(screen.queryByRole('option', { name: /Day 2,/ })).not.toBeInTheDocument()
  })

  it('selects and focuses Days with arrows, Home, and End', async () => {
    const user = userEvent.setup()
    render(<DayHarness />)
    const first = screen.getByRole('option', { name: 'Day 1, 일상과 루틴, 완료' })
    first.focus()

    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('option', { name: /Day 3,/ })).toHaveFocus()
    expect(screen.getByRole('option', { name: /Day 3,/ })).toHaveAttribute('aria-selected', 'true')

    await user.keyboard('{End}')
    expect(screen.getByRole('option', { name: /Day 8,/ })).toHaveFocus()
    await user.keyboard('{Home}')
    expect(first).toHaveFocus()
  })
})

describe('useDaySelection', () => {
  it('restores only a Day that exists in the current index', () => {
    window.localStorage.setItem('voca3000:selected-day', '3')
    const { result, unmount } = renderHook(() => useDaySelection({ days }))
    expect(result.current.selectedDay).toBe(3)
    unmount()

    window.localStorage.setItem('voca3000:selected-day', '99')
    const fallback = renderHook(() => useDaySelection({ days }))
    expect(fallback.result.current.selectedDay).toBe(1)
  })

  it('commits a selection only after preparation succeeds', async () => {
    const prepareDay = vi.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() => useDaySelection({ days, prepareDay }))

    await act(async () => {
      await expect(result.current.selectDay(3)).resolves.toBe(true)
    })

    expect(result.current.selectedDay).toBe(3)
    expect(window.localStorage.getItem('voca3000:selected-day')).toBe('3')
  })

  it('keeps the previous Day and reports an error when preparation fails', async () => {
    const prepareDay = vi.fn().mockRejectedValue(new Error('Day load failed'))
    const { result } = renderHook(() => useDaySelection({ days, prepareDay }))

    await act(async () => {
      await expect(result.current.selectDay(3)).resolves.toBe(false)
    })

    expect(result.current.selectedDay).toBe(1)
    expect(result.current.selectionError?.message).toBe('Day load failed')
    expect(window.localStorage.getItem('voca3000:selected-day')).not.toBe('3')
  })
})

describe('AppTabs', () => {
  function TabHarness() {
    const [selectedTab, setSelectedTab] = useState<AppTab>('study')
    return (
      <AppTabs
        selectedTab={selectedTab}
        onSelectTab={setSelectedTab}
        panels={{
          study: <p>학습 패널</p>,
          'ko-to-en': <p>한영 패널</p>,
          'en-to-ko': <p>영한 패널</p>,
          incorrect: <p>오답 패널</p>,
        }}
      />
    )
  }

  it('links tabs and panels with the required ARIA roles', () => {
    render(<TabHarness />)

    expect(screen.getByRole('tablist', { name: '학습 모드' })).toBeInTheDocument()
    const studyTab = screen.getByRole('tab', { name: '학습' })
    expect(studyTab).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel')).toHaveTextContent('학습 패널')
    expect(studyTab).toHaveAttribute('aria-controls', screen.getByRole('tabpanel').id)
  })

  it('supports automatic arrow selection and Home/End navigation', async () => {
    const user = userEvent.setup()
    render(<TabHarness />)
    const studyTab = screen.getByRole('tab', { name: '학습' })
    studyTab.focus()

    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: '한→영' })).toHaveFocus()
    expect(screen.getByRole('tabpanel')).toHaveTextContent('한영 패널')

    await user.keyboard('{End}')
    expect(screen.getByRole('tab', { name: '오답노트' })).toHaveFocus()
    await user.keyboard('{Home}')
    await waitFor(() => expect(studyTab).toHaveFocus())
    expect(screen.getByRole('tabpanel')).toHaveTextContent('학습 패널')
  })
})
