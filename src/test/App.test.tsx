import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import day01Data from '../../public/data/words-day01.json'
import indexData from '../../public/data/words-index.json'
import App from '../App'
import { deleteDatabase, VocaDatabase } from '../db'
import { validateDayIndex, validateWordItems } from '../utils/validators'

const days = validateDayIndex(indexData)
const words = validateWordItems(day01Data, days[0]!)

let database: VocaDatabase
let databaseNumber = 0

beforeEach(() => {
  databaseNumber += 1
  database = new VocaDatabase(`Voca3000AppTestDB-${databaseNumber}`)
  window.localStorage.clear()
})

afterEach(async () => {
  await deleteDatabase(database)
})

function createRepository() {
  return {
    clearCache: vi.fn(),
    getDayIndex: vi.fn().mockResolvedValue(days),
    getWordsForDay: vi.fn().mockResolvedValue(words),
  }
}

function enterEnglishStudy(): void {
  fireEvent.click(screen.getByRole('button', { name: /영어 공부하기/ }))
}

describe('App integration', () => {
  it('starts on the service introduction and keeps Japanese visibly unavailable', () => {
    const repository = createRepository()
    render(<App repository={repository} database={database} />)

    expect(screen.getByRole('heading', { name: /배우고, 풀어보고/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /영어 공부하기/ })).toBeEnabled()
    expect(screen.getByRole('button', { name: /일본어 공부하기/ })).toBeDisabled()
    expect(repository.getDayIndex).not.toHaveBeenCalled()
  })

  it('loads the index and Day before rendering the app shell', async () => {
    const repository = createRepository()
    render(<App repository={repository} database={database} />)
    enterEnglishStudy()

    expect(screen.getByRole('status')).toHaveTextContent('학습 Day 목록')
    expect(await screen.findByRole('button', { name: 'voca3000 홈' })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'commute' })).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: '외운 단어' })).toHaveAttribute(
      'aria-valuenow',
      '0',
    )
    expect(repository.getDayIndex).toHaveBeenCalledOnce()
    expect(repository.getWordsForDay).toHaveBeenCalledWith(1)
  })

  it('shows live mastered and study completion state from IndexedDB', async () => {
    await database.progress.put({
      wordId: 'w0001',
      isMastered: true,
      correctCountKoToEn: 0,
      incorrectCountKoToEn: 0,
      correctCountEnToKo: 0,
      incorrectCountEnToKo: 0,
      lastStudiedAt: '2026-10-12T00:00:00.000Z',
    })
    await database.daySessions.put({
      day: 1,
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
    expect(screen.getByRole('option', { name: /Day 1.+완료/ })).toBeInTheDocument()
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

    expect(await screen.findByRole('button', { name: 'voca3000 홈' })).toBeInTheDocument()
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

    expect(await screen.findByRole('heading', { name: 'commute' })).toBeInTheDocument()
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

    fireEvent.click(await screen.findByRole('button', { name: '언어 선택으로 돌아가기' }))
    expect(screen.getByRole('heading', { name: /배우고, 풀어보고/ })).toBeInTheDocument()
  })
})
