import type { DayIndexItem, WordItem } from '../types/word'
import {
  validateDayIndex,
  validateWordItems,
  WordDataValidationError,
} from '../utils/validators'

export type WordRepositoryErrorCode =
  | 'NETWORK_ERROR'
  | 'HTTP_ERROR'
  | 'INVALID_JSON'
  | 'DATA_VALIDATION_ERROR'
  | 'DAY_NOT_FOUND'

const LOAD_ERROR_MESSAGE = '학습 데이터를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.'
const INVALID_DATA_MESSAGE = '학습 데이터에 문제가 있어 열 수 없어요. 다시 시도해 주세요.'
const DAY_NOT_FOUND_MESSAGE = '선택한 Day는 아직 학습할 수 없어요.'

export class WordRepositoryError extends Error {
  readonly code: WordRepositoryErrorCode
  readonly userMessage: string

  constructor(
    code: WordRepositoryErrorCode,
    userMessage: string,
    detail: string,
    options?: ErrorOptions,
  ) {
    super(detail, options)
    this.name = 'WordRepositoryError'
    this.code = code
    this.userMessage = userMessage
  }
}

export interface WordRepositoryOptions {
  baseUrl?: string
  fetcher?: typeof fetch
  indexPath?: string
}

function joinBaseUrl(baseUrl: string, filePath: string): string {
  const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  return `${normalizedBaseUrl}${filePath.replace(/^\/+/, '')}`
}

export class WordRepository {
  private readonly baseUrl: string
  private readonly fetcher: typeof fetch
  private readonly indexPath: string
  private indexPromise: Promise<DayIndexItem[]> | null = null
  private readonly dayPromises = new Map<number, Promise<WordItem[]>>()

  constructor(options: WordRepositoryOptions = {}) {
    this.baseUrl = options.baseUrl ?? import.meta.env.BASE_URL
    this.fetcher = (options.fetcher ?? globalThis.fetch).bind(globalThis)
    this.indexPath = options.indexPath ?? 'data/words-index.json'
  }

  getDayIndex(): Promise<DayIndexItem[]> {
    if (this.indexPromise === null) {
      this.indexPromise = this.loadDayIndex().catch((error: unknown) => {
        this.indexPromise = null
        throw error
      })
    }

    return this.indexPromise
  }

  async getWordsForDay(day: number): Promise<WordItem[]> {
    if (!Number.isInteger(day) || day < 1 || day > 100) {
      throw new WordRepositoryError(
        'DAY_NOT_FOUND',
        DAY_NOT_FOUND_MESSAGE,
        `Requested Day must be an integer from 1 to 100; received ${String(day)}.`,
      )
    }

    const cached = this.dayPromises.get(day)
    if (cached !== undefined) {
      return cached
    }

    const promise = this.loadWordsForDay(day).catch((error: unknown) => {
      this.dayPromises.delete(day)
      throw error
    })
    this.dayPromises.set(day, promise)
    return promise
  }

  clearCache(): void {
    this.indexPromise = null
    this.dayPromises.clear()
  }

  private async loadDayIndex(): Promise<DayIndexItem[]> {
    const url = joinBaseUrl(this.baseUrl, this.indexPath)
    const data = await this.fetchJson(url, 'Day index')

    try {
      return validateDayIndex(data)
    } catch (error) {
      throw this.toValidationError(error, 'Day index')
    }
  }

  private async loadWordsForDay(day: number): Promise<WordItem[]> {
    const index = await this.getDayIndex()
    const dayIndex = index.find((item) => item.day === day)

    if (dayIndex === undefined) {
      throw new WordRepositoryError(
        'DAY_NOT_FOUND',
        DAY_NOT_FOUND_MESSAGE,
        `Day ${day} is not registered in words-index.json.`,
      )
    }

    const url = joinBaseUrl(this.baseUrl, dayIndex.filePath)
    const data = await this.fetchJson(url, `Day ${day}`)

    try {
      return validateWordItems(data, dayIndex)
    } catch (error) {
      throw this.toValidationError(error, `Day ${day}`)
    }
  }

  private async fetchJson(url: string, label: string): Promise<unknown> {
    let response: Response

    try {
      response = await this.fetcher(url, { cache: 'no-store' })
    } catch (error) {
      throw new WordRepositoryError(
        'NETWORK_ERROR',
        LOAD_ERROR_MESSAGE,
        `${label} request failed for ${url}.`,
        { cause: error },
      )
    }

    if (!response.ok) {
      throw new WordRepositoryError(
        'HTTP_ERROR',
        LOAD_ERROR_MESSAGE,
        `${label} request returned HTTP ${response.status} for ${url}.`,
      )
    }

    try {
      return await response.json()
    } catch (error) {
      throw new WordRepositoryError(
        'INVALID_JSON',
        INVALID_DATA_MESSAGE,
        `${label} response was not valid JSON (${url}).`,
        { cause: error },
      )
    }
  }

  private toValidationError(error: unknown, label: string): WordRepositoryError {
    if (error instanceof WordDataValidationError) {
      return new WordRepositoryError(
        'DATA_VALIDATION_ERROR',
        error.userMessage,
        `${label} validation failed at ${error.path} [${error.code}]: ${error.message}`,
        { cause: error },
      )
    }

    return new WordRepositoryError(
      'DATA_VALIDATION_ERROR',
      INVALID_DATA_MESSAGE,
      `${label} validation failed unexpectedly.`,
      { cause: error },
    )
  }
}

export const wordRepository = new WordRepository()
export const japaneseWordRepository = new WordRepository({ indexPath: 'data/japanese-words-index.json' })
