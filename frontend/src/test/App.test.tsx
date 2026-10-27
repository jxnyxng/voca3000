import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import day01Data from '../../public/data/words-day01.json'
import indexData from '../../public/data/words-index.json'
import App from '../App'
import { deleteDatabase, VocaDatabase } from '../db'
import { builtinContentId, progressRecordId } from '../types/content'
import { validateDayIndex, validateWordItems } from '../utils/validators'

const days = validateDayIndex(indexData)
const words = validateWordItems(day01Data, days[0]!)
const CONTENT_ID = builtinContentId('en', 1)

let database: VocaDatabase
let databaseNumber = 0

beforeEach(() => {
  databaseNumber += 1
  database = new VocaDatabase(`Voca3000AppTestDB-${databaseNumber}`)
  window.localStorage.clear()
  window.history.replaceState(null, '', '#/')
})

afterEach(async () => {
  await deleteDatabase(database)
})

function createRepository() {
  return {
    clearCache: vi.fn(),
    getDayIndex: vi.fn().mockResolvedValue(days),
    getWordsForDay: vi.fn().mockResolvedValue(words),
    prefetchDays: vi.fn().mockResolvedValue(undefined),
  }
}

function enterEnglishStudy(): void {
  fireEvent.click(screen.getByRole('button', { name: /영어 공부하기/ }))
}

describe('App integration', () => {
  it('starts on the service introduction with both study languages available', () => {
    const repository = createRepository()
    render(<App repository={repository} database={database} />)

    expect(screen.getByRole('heading', { name: /회화 단어,하루 30개씩/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /영어 공부하기/ })).toBeEnabled()
    expect(screen.getByRole('button', { name: /일본어 공부하기/ })).toBeEnabled()
    expect(screen.queryByText('내 텍스트로 공부하기')).not.toBeInTheDocument()
    expect(document.querySelector('[data-language-flag="us"]')).toBeInTheDocument()
    expect(document.querySelector('[data-language-flag="jp"]')).toBeInTheDocument()
    expect(repository.getDayIndex).not.toHaveBeenCalled()
  })

  it('loads the index and Day before rendering the app shell', async () => {
    const repository = createRepository()
    render(<App repository={repository} database={database} />)
    enterEnglishStudy()

    expect(screen.getByRole('status')).toHaveTextContent('학습 Day 목록')
    expect(await screen.findByRole('button', { name: '워드득 홈' })).toBeInTheDocument()
    expect(await screen.findByRole('region', { name: '단어 학습 카드' })).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: '외운 단어' })).toHaveAttribute(
      'aria-valuenow',
      '0',
    )
    expect(repository.getDayIndex).toHaveBeenCalledOnce()
    expect(repository.getWordsForDay).toHaveBeenCalledWith(1)
  })

  it('opens the last English Day when returning from home', async () => {
    const repository = createRepository()
    render(<App repository={repository} database={database} />)
    enterEnglishStudy()
    await screen.findByRole('region', { name: '단어 학습 카드' })

    fireEvent.click(screen.getByRole('option', { name: /Day 3,/ }))
    await waitFor(() => expect(window.localStorage.getItem('voca3000:selected-day')).toBe('3'))
    fireEvent.click(screen.getByRole('button', { name: '워드득 홈' }))
    enterEnglishStudy()

    expect(window.location.hash).toBe('#/english/day/3/study')
    expect(await screen.findByRole('option', { name: /Day 3,/ })).toHaveAttribute('aria-selected', 'true')
    expect(repository.getWordsForDay).toHaveBeenCalledWith(3)
  })

  it('keeps the last Day separate for English and Japanese', async () => {
    window.localStorage.setItem('voca3000:selected-day', '3')
    window.localStorage.setItem('voca3000:selected-day:ja', '2')
    render(<App repository={createRepository()} database={database} />)

    fireEvent.click(screen.getByRole('button', { name: /일본어 공부하기/ }))
    expect(window.location.hash).toBe('#/japanese/day/2/study')
    act(() => {
      window.history.pushState(null, '', '#/')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    enterEnglishStudy()
    expect(window.location.hash).toBe('#/english/day/3/study')
  })

  it('selects an unreleased Day as a preview without requesting missing data', async () => {
    const repository = createRepository()
    render(<App repository={repository} database={database} />)
    enterEnglishStudy()

    await screen.findByRole('region', { name: '단어 학습 카드' })
    fireEvent.click(screen.getByRole('option', { name: 'Day 100, 준비 중' }))

    expect(screen.getByRole('option', { name: 'Day 100, 준비 중' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('heading', { name: 'Day 100 준비 중이에요' })).toBeInTheDocument()
    expect(screen.getByText('Day 100')).toBeInTheDocument()
    expect(repository.getWordsForDay).toHaveBeenCalledTimes(1)
  })

  it('shows live mastered and study completion state from IndexedDB', async () => {
    await database.progress.put({
      progressId: progressRecordId(CONTENT_ID, 'w0001'),
      contentId: CONTENT_ID,
      wordId: 'w0001',
      isMastered: true,
      correctCountKoToEn: 0,
      incorrectCountKoToEn: 0,
      correctCountEnToKo: 0,
      incorrectCountEnToKo: 0,
      lastStudiedAt: '2026-10-12T00:00:00.000Z',
    })
    await database.daySessions.put({
      contentId: CONTENT_ID,
      completedStudy: true,
      koToEnHighScore: 0,
      enToKoHighScore: 0,
    })
    render(<App repository={createRepository()} database={database} />)
    enterEnglishStudy()

    await waitFor(() => {
      expect(screen.getByRole('progressbar', { name: '외운 단어' })).toHaveAttribute(
        'aria-valuenow',
        '1',
      )
    })
    expect(screen.getByText('학습 완료')).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /^Day 1,.+완료$/ })).toBeInTheDocument()
  })

  it('retries an index failure after clearing the repository cache', async () => {
    const repository = createRepository()
    repository.getDayIndex
      .mockRejectedValueOnce(new Error('index failed'))
      .mockResolvedValueOnce(days)
    render(<App repository={repository} database={database} />)
    enterEnglishStudy()

    expect(await screen.findByRole('heading', { name: 'Day 목록을 불러오지 못했어요' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }))

    expect(await screen.findByRole('button', { name: '워드득 홈' })).toBeInTheDocument()
    expect(repository.clearCache).toHaveBeenCalledOnce()
    expect(repository.getDayIndex).toHaveBeenCalledTimes(2)
  })

  it('retries a selected Day failure without losing the selected Day', async () => {
    const repository = createRepository()
    repository.getWordsForDay
      .mockRejectedValueOnce(new Error('day failed'))
      .mockResolvedValueOnce(words)
    render(<App repository={repository} database={database} />)
    enterEnglishStudy()

    expect(await screen.findByText('데이터를 불러오지 못했어요. 다시 시도해 주세요.')).toBeInTheDocument()
    expect(screen.getByText('Day 01')).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /Day 1,/ })).toHaveTextContent('1')
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }))

    expect(await screen.findByRole('region', { name: '단어 학습 카드' })).toBeInTheDocument()
    expect(repository.getWordsForDay).toHaveBeenCalledTimes(2)
  })

  it('renders a clear empty state when no Days are deployed', async () => {
    const repository = createRepository()
    repository.getDayIndex.mockResolvedValue([])
    render(<App repository={repository} database={database} />)
    enterEnglishStudy()

    expect(await screen.findByRole('heading', { name: '학습할 Day가 없어요' })).toBeInTheDocument()
    await waitFor(() => expect(repository.getWordsForDay).not.toHaveBeenCalled())
  })

  it('returns from study to the language selection page', async () => {
    render(<App repository={createRepository()} database={database} />)
    enterEnglishStudy()

    fireEvent.click(await screen.findByRole('button', { name: '워드득 홈' }))
    expect(screen.getByRole('heading', { name: /회화 단어,하루 30개씩/ })).toBeInTheDocument()
  })

  it('removes legacy home and backup actions from the study header', async () => {
    render(<App repository={createRepository()} database={database} />)
    enterEnglishStudy()

    await screen.findByRole('region', { name: '단어 학습 카드' })
    expect(screen.queryByRole('button', { name: '학습 데이터 백업 및 복원' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '언어 선택으로 돌아가기' })).not.toBeInTheDocument()
  })

  it('gives tabs distinct addresses and restores the prior page on browser back', async () => {
    render(<App repository={createRepository()} database={database} />)
    enterEnglishStudy()
    await screen.findByRole('region', { name: '단어 학습 카드' })
    expect(window.location.hash).toBe('#/english/day/1/study')

    fireEvent.click(screen.getByRole('tab', { name: '테스트 한→영' }))
    expect(window.location.hash).toBe('#/english/day/1/quiz-from-korean')
    expect(await screen.findByLabelText('내 답안')).toBeInTheDocument()

    window.history.back()
    await waitFor(() => expect(window.location.hash).toBe('#/english/day/1/study'))
    expect(screen.getByRole('tab', { name: '단어장' })).toHaveAttribute('aria-selected', 'true')
  })

  it('opens a directly addressed study page on its requested tab', async () => {
    window.history.replaceState(null, '', '#/english/day/1/quiz-to-korean')
    render(<App repository={createRepository()} database={database} />)

    expect(await screen.findByRole('tab', { name: '테스트 영→한' })).toHaveAttribute('aria-selected', 'true')
  })
})
