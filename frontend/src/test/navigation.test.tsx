import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppTabs } from '../components/common/AppTabs'
import { Header } from '../components/common/Header'
import { DaySelector } from '../components/day/DaySelector'
import { useDaySelection } from '../hooks/useDaySelection'
import { readRoute, routeHash } from '../hooks/useHashRoute'
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

describe('hash routes', () => {
  it('recognizes the custom song workspace route', () => {
    window.history.replaceState(null, '', '#/custom')
    expect(readRoute()).toEqual({ language: 'custom', day: 1, tab: 'study' })
    expect(routeHash({ language: 'custom', day: 99, tab: 'incorrect' })).toBe('#/custom')
  })

  it('round-trips a custom song content ID', () => {
    const customSongId = 'custom:song:song-1234abcd'
    window.history.replaceState(null, '', routeHash({ language: 'custom', day: 1, tab: 'study', customSongId }))
    expect(readRoute().customSongId).toBe(customSongId)
  })
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
    expect(screen.getByRole('option', { name: 'Day 1, 일상과 루틴, 완료' })).toHaveClass('size-8', 'sm:size-9', 'rounded-lg', 'text-white', 'lg:text-toss-blue')
    expect(screen.getByRole('option', { name: 'Day 1, 일상과 루틴, 완료' })).not.toHaveClass('lg:left-2', 'lg:w-full')
    expect(screen.getByRole('listbox', { name: '학습 Day 선택' })).toHaveClass('lg:-ml-6', 'lg:pl-6')
    expect(screen.getByRole('option', { name: 'Day 1, 일상과 루틴, 완료' })).not.toHaveClass('underline')
    expect(screen.getByRole('option', { name: 'Day 1, 일상과 루틴, 완료' })).not.toHaveClass('hover:bg-toss-border/60')
    expect(screen.getByRole('option', { name: 'Day 1, 일상과 루틴, 완료' }).querySelector('[data-day-indicator]')).toHaveTextContent('Day')
    expect(screen.getByRole('option', { name: 'Day 1, 일상과 루틴, 완료' }).querySelector('[data-day-mobile-indicator]')).toHaveClass('rounded-full', 'bg-white', 'lg:hidden')
    expect(screen.getByRole('option', { name: 'Day 1, 일상과 루틴, 완료' }).querySelector('span:last-child')).toHaveClass('text-base')
    expect(screen.getByRole('option', { name: /Day 3,/ })).toHaveClass('text-white/70', 'lg:text-toss-muted', 'lg:hover:bg-toss-border/60')
    expect(screen.getByRole('option', { name: /Day 3,/ }).querySelector('span:last-child')).toHaveClass('text-sm')
    expect(screen.queryByRole('option', { name: /Day 2,/ })).not.toBeInTheDocument()
  })

  it('renders selectable preview Day slots up to the requested total', async () => {
    const onSelectDay = vi.fn()
    const user = userEvent.setup()
    render(
      <DaySelector
        days={days}
        selectedDay={1}
        completedDays={new Set()}
        totalDays={100}
        onSelectDay={onSelectDay}
      />,
    )

    expect(screen.getAllByRole('option')).toHaveLength(100)
    expect(screen.getByRole('option', { name: 'Day 2, 준비 중' })).toBeEnabled()
    expect(screen.getByRole('option', { name: 'Day 100, 준비 중' })).toBeEnabled()
    expect(screen.getByRole('option', { name: /Day 3,/ })).toBeEnabled()

    await user.click(screen.getByRole('option', { name: 'Day 100, 준비 중' }))
    expect(onSelectDay).toHaveBeenCalledWith(100)
  })

  it('shows scroll fades only in directions with remaining content', () => {
    const { container } = render(<DayHarness />)
    const listbox = screen.getByRole('listbox', { name: '학습 Day 선택' })
    Object.defineProperties(listbox, {
      clientHeight: { configurable: true, value: 100 },
      scrollHeight: { configurable: true, value: 1000 },
    })

    fireEvent(window, new Event('resize'))
    expect(container.querySelector('[data-day-scroll-shadow="top"]')).not.toBeInTheDocument()
    expect(container.querySelector('[data-day-scroll-shadow="bottom"]')).toHaveClass('bg-gradient-to-t')

    listbox.scrollTop = 900
    fireEvent.scroll(listbox)
    expect(container.querySelector('[data-day-scroll-shadow="top"]')).toHaveClass('bg-gradient-to-b')
    expect(container.querySelector('[data-day-scroll-shadow="bottom"]')).not.toBeInTheDocument()
  })

  it('smoothly centers a selected Day while clamping to the scroll range', async () => {
    const user = userEvent.setup()
    render(<DayHarness />)
    const listbox = screen.getByRole('listbox', { name: '학습 Day 선택' })
    const thirdDay = screen.getByRole('option', { name: /Day 3,/ })
    const scrollTo = vi.fn()
    Object.defineProperties(listbox, {
      clientHeight: { configurable: true, value: 100 },
      scrollHeight: { configurable: true, value: 1000 },
      scrollTo: { configurable: true, value: scrollTo },
    })
    Object.defineProperties(thirdDay, {
      offsetTop: { configurable: true, value: 400 },
      offsetHeight: { configurable: true, value: 36 },
    })

    await user.click(thirdDay)
    expect(scrollTo).toHaveBeenCalledWith({ top: 368, behavior: 'smooth' })
  })

  it('horizontally centers the selected Day on mobile', async () => {
    const originalInnerWidth = window.innerWidth
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 })
    const user = userEvent.setup()
    render(<DayHarness />)
    const listbox = screen.getByRole('listbox', { name: '학습 Day 선택' })
    const thirdDay = screen.getByRole('option', { name: /Day 3,/ })
    const scrollTo = vi.fn()
    Object.defineProperties(listbox, {
      clientWidth: { configurable: true, value: 300 },
      scrollWidth: { configurable: true, value: 1000 },
      scrollTo: { configurable: true, value: scrollTo },
    })
    Object.defineProperties(thirdDay, {
      offsetLeft: { configurable: true, value: 400 },
      offsetWidth: { configurable: true, value: 36 },
    })

    await user.click(thirdDay)
    expect(scrollTo).toHaveBeenCalledWith({ left: 268, behavior: 'smooth' })
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalInnerWidth })
  })

  it('selects and focuses Days with arrows, Home, and End', async () => {
    const user = userEvent.setup()
    render(<DayHarness />)
    const first = screen.getByRole('option', { name: 'Day 1, 일상과 루틴, 완료' })
    first.focus()

    await user.keyboard('{ArrowRight}')
    const thirdDay = screen.getByRole('option', { name: /Day 3,/ })
    expect(thirdDay).toHaveFocus()
    expect(thirdDay).toHaveAttribute('aria-selected', 'true')
    expect(thirdDay.querySelector('[data-day-indicator]')).toHaveTextContent('Day')
    await waitFor(() => expect(first.querySelector('[data-day-indicator]')).not.toBeInTheDocument())

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

  it('uses separate saved Days for each language', () => {
    window.localStorage.setItem('voca3000:selected-day', '3')
    window.localStorage.setItem('voca3000:selected-day:ja', '8')
    const japaneseDays = days.map((day) => ({ ...day, language: 'ja' as const }))

    const { result } = renderHook(() => useDaySelection({ days: japaneseDays }))
    expect(result.current.selectedDay).toBe(8)
  })

  it('commits a selection immediately while preparation continues', async () => {
    let finishPreparation: (() => void) | undefined
    const prepareDay = vi.fn(() => new Promise<void>((resolve) => { finishPreparation = resolve }))
    const { result } = renderHook(() => useDaySelection({ days, prepareDay }))

    let selection: Promise<boolean>
    await act(async () => {
      selection = result.current.selectDay(3)
    })

    expect(result.current.selectedDay).toBe(3)
    expect(result.current.pendingDay).toBe(3)
    expect(window.localStorage.getItem('voca3000:selected-day')).toBe('3')
    finishPreparation?.()
    await act(async () => {
      await expect(selection!).resolves.toBe(true)
    })
  })

  it('keeps the requested Day visible and reports an error when preparation fails', async () => {
    const prepareDay = vi.fn().mockRejectedValue(new Error('Day load failed'))
    const { result } = renderHook(() => useDaySelection({ days, prepareDay }))

    await act(async () => {
      await expect(result.current.selectDay(3)).resolves.toBe(false)
    })

    expect(result.current.selectedDay).toBe(3)
    expect(result.current.selectionError?.message).toBe('Day load failed')
    expect(window.localStorage.getItem('voca3000:selected-day')).toBe('3')
  })
})

describe('header learning tabs', () => {
  function TabHarness() {
    const [selectedTab, setSelectedTab] = useState<AppTab>('study')
    const [direction, setDirection] = useState<'ko-to-en' | 'en-to-ko'>('ko-to-en')
    return <>
      <Header day={1} category="test" masteredCount={0} totalCount={3}
        selectedTab={selectedTab}
        direction={direction}
        onSelectTab={(tab) => {
          if (tab === 'ko-to-en' || tab === 'en-to-ko') setDirection(tab)
          setSelectedTab(tab)
        }}
        onSelectDirection={(mode) => {
          setDirection(mode)
          if (selectedTab === 'ko-to-en' || selectedTab === 'en-to-ko') setSelectedTab(mode)
        }} />
      <AppTabs selectedTab={selectedTab} panels={{
        study: <p>학습 패널</p>,
        'ko-to-en': <p>한영 패널</p>,
        'en-to-ko': <p>영한 패널</p>,
        incorrect: <p>오답 패널</p>,
      }} />
    </>
  }

  it('shows three top tabs and a colored direction selector in one row', async () => {
    const user = userEvent.setup()
    render(<TabHarness />)
    const mainTabs = screen.getByRole('tablist', { name: '학습 영역' })
    expect(mainTabs).toHaveClass('gap-0')
    expect(mainTabs.querySelectorAll('[role="tab"]')).toHaveLength(3)
    expect(screen.getByRole('tab', { name: '단어장' })).toHaveClass('bg-toss-blue')
    const directionTabs = screen.getByRole('tablist', { name: '학습 방향' })
    expect(directionTabs.querySelector('[aria-selected="true"]')).toHaveClass('bg-toss-blue')
    expect(directionTabs.parentElement).toBe(mainTabs.parentElement)
    expect(screen.getByRole('tab', { name: '한→영' })).toHaveAttribute('aria-selected', 'true')
    await user.click(screen.getByRole('tab', { name: '영→한' }))
    expect(screen.getByRole('tab', { name: '영→한' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel')).toHaveTextContent('학습 패널')
  })

  it('switches quiz direction while keeping the parent test tab selected', async () => {
    const user = userEvent.setup()
    render(<TabHarness />)
    await user.click(screen.getByRole('tab', { name: '테스트' }))
    expect(screen.getByRole('tab', { name: '테스트' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tablist', { name: '학습 방향' })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('tabpanel')).toHaveTextContent('한영 패널'))
    await user.click(screen.getByRole('tab', { name: '영→한' }))
    expect(document.getElementById('learning-panel-ko-to-en')).not.toHaveAttribute('hidden')
    expect(document.getElementById('learning-panel-en-to-ko')).toHaveAttribute('hidden')
    await waitFor(() => expect(screen.getByRole('tabpanel')).toHaveTextContent('영한 패널'))
    expect(screen.getByRole('tab', { name: '테스트' })).toHaveAttribute('aria-selected', 'true')
    await user.click(screen.getByRole('tab', { name: '오답노트' }))
    expect(screen.getByRole('tablist', { name: '학습 방향' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '영→한' })).toHaveAttribute('aria-selected', 'true')
    await user.click(screen.getByRole('tab', { name: '단어장' }))
    expect(screen.getByRole('tab', { name: '영→한' })).toHaveAttribute('aria-selected', 'true')
  })

  it('supports keyboard navigation for parent and direction tabs', async () => {
    const user = userEvent.setup()
    render(<TabHarness />)
    screen.getByRole('tab', { name: '단어장' }).focus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: '테스트' })).toHaveFocus()
    screen.getByRole('tab', { name: '한→영' }).focus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: '영→한' })).toHaveFocus()
  })
})
