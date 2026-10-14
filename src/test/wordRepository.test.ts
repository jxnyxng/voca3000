import { beforeEach, describe, expect, it, vi } from 'vitest'
import day01Data from '../../public/data/words-day01.json'
import indexData from '../../public/data/words-index.json'
import {
  WordRepository,
  WordRepositoryError,
  type WordRepositoryErrorCode,
} from '../services/wordRepository'

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function expectRepositoryError(
  promise: Promise<unknown>,
  code: WordRepositoryErrorCode,
): Promise<WordRepositoryError> {
  try {
    await promise
  } catch (error) {
    expect(error).toBeInstanceOf(WordRepositoryError)
    if (error instanceof WordRepositoryError) {
      expect(error.code).toBe(code)
      expect(error.userMessage).not.toContain('words-index.json')
      return error
    }
  }

  throw new Error(`Expected ${code} repository error`)
}

describe('WordRepository', () => {
  const fetcher = vi.fn<typeof fetch>()

  beforeEach(() => {
    fetcher.mockReset()
  })

  it('loads the index and selected Day using BASE_URL-relative paths', async () => {
    fetcher
      .mockResolvedValueOnce(jsonResponse(indexData))
      .mockResolvedValueOnce(jsonResponse(day01Data))
    const repository = new WordRepository({ baseUrl: '/voca3000/', fetcher })

    const words = await repository.getWordsForDay(1)

    expect(words).toHaveLength(30)
    expect(fetcher).toHaveBeenNthCalledWith(1, '/voca3000/data/words-index.json')
    expect(fetcher).toHaveBeenNthCalledWith(2, '/voca3000/data/words-day01.json')
  })

  it('calls the fetch implementation with the browser global context', async () => {
    const contextFetcher = function (this: unknown): Promise<Response> {
      if (this !== globalThis) throw new TypeError('Invalid fetch context')
      return Promise.resolve(jsonResponse(indexData))
    } as typeof fetch
    const repository = new WordRepository({ fetcher: contextFetcher })

    await expect(repository.getDayIndex()).resolves.toHaveLength(50)
  })

  it('reuses in-flight and completed index and Day requests', async () => {
    fetcher
      .mockResolvedValueOnce(jsonResponse(indexData))
      .mockResolvedValueOnce(jsonResponse(day01Data))
    const repository = new WordRepository({ baseUrl: './', fetcher })

    const [first, second] = await Promise.all([
      repository.getWordsForDay(1),
      repository.getWordsForDay(1),
    ])
    const third = await repository.getWordsForDay(1)

    expect(first).toBe(second)
    expect(second).toBe(third)
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('allows a failed request to be retried', async () => {
    fetcher
      .mockRejectedValueOnce(new TypeError('offline'))
      .mockResolvedValueOnce(jsonResponse(indexData))
    const repository = new WordRepository({ fetcher })

    await expectRepositoryError(repository.getDayIndex(), 'NETWORK_ERROR')
    await expect(repository.getDayIndex()).resolves.toHaveLength(50)
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('distinguishes HTTP and malformed JSON failures', async () => {
    const httpFetcher = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({}, 404))
    const httpRepository = new WordRepository({ fetcher: httpFetcher })
    await expectRepositoryError(httpRepository.getDayIndex(), 'HTTP_ERROR')

    const invalidJsonResponse = new Response('{not-json', {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
    const jsonFetcher = vi.fn<typeof fetch>().mockResolvedValue(invalidJsonResponse)
    const jsonRepository = new WordRepository({ fetcher: jsonFetcher })
    await expectRepositoryError(jsonRepository.getDayIndex(), 'INVALID_JSON')
  })

  it('wraps index and Day validation failures without exposing the payload', async () => {
    const invalidIndexFetcher = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ secret: 'value' }))
    const invalidIndexRepository = new WordRepository({ fetcher: invalidIndexFetcher })
    const indexError = await expectRepositoryError(
      invalidIndexRepository.getDayIndex(),
      'DATA_VALIDATION_ERROR',
    )
    expect(indexError.userMessage).not.toContain('secret')

    const invalidDay = day01Data.map((word, index) =>
      index === 0 ? { ...word, category: 'Work & Campus' } : word,
    )
    const invalidDayFetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse(indexData))
      .mockResolvedValueOnce(jsonResponse(invalidDay))
    const invalidDayRepository = new WordRepository({ fetcher: invalidDayFetcher })
    await expectRepositoryError(
      invalidDayRepository.getWordsForDay(1),
      'DATA_VALIDATION_ERROR',
    )
  })

  it('rejects unavailable and out-of-range days without fetching a Day file', async () => {
    fetcher.mockResolvedValueOnce(jsonResponse(indexData))
    const repository = new WordRepository({ fetcher })

    await expectRepositoryError(repository.getWordsForDay(51), 'DAY_NOT_FOUND')
    await expectRepositoryError(repository.getWordsForDay(0), 'DAY_NOT_FOUND')

    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('clears both caches explicitly', async () => {
    fetcher
      .mockResolvedValueOnce(jsonResponse(indexData))
      .mockResolvedValueOnce(jsonResponse(day01Data))
      .mockResolvedValueOnce(jsonResponse(indexData))
      .mockResolvedValueOnce(jsonResponse(day01Data))
    const repository = new WordRepository({ fetcher })

    await repository.getWordsForDay(1)
    repository.clearCache()
    await repository.getWordsForDay(1)

    expect(fetcher).toHaveBeenCalledTimes(4)
  })
})
