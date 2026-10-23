import {
  CATEGORIES,
  PARTS_OF_SPEECH,
  type CategoryType,
  type DayIndexItem,
  type PartOfSpeech,
  type WordItem,
} from '../types/word'
import {
  assertNoAnswerCollisions,
  normalizeEnglish,
  normalizeJapanese,
  normalizeKorean,
  TextMatcherError,
} from './textMatcher'

export type WordDataErrorCode =
  | 'INVALID_ROOT'
  | 'INVALID_FIELD'
  | 'INVALID_INDEX'
  | 'INVALID_WORD'
  | 'DUPLICATE_DAY'
  | 'DUPLICATE_WORD_ID'
  | 'ANSWER_COLLISION'
  | 'DAY_MISMATCH'
  | 'CATEGORY_MISMATCH'
  | 'WORD_COUNT_MISMATCH'
  | 'MISSING_DAY_DATA'

const USER_MESSAGE = '단어 데이터에 문제가 있어 학습을 시작할 수 없어요. 다시 시도해 주세요.'
const WORD_ID_PATTERN = /^(?:w|j)(?:0{3}[1-9]|0{2}[1-9]\d|0[1-9]\d{2}|[12]\d{3}|3000)$/

export class WordDataValidationError extends Error {
  readonly userMessage = USER_MESSAGE
  readonly code: WordDataErrorCode
  readonly path: string

  constructor(
    code: WordDataErrorCode,
    path: string,
    detail: string,
  ) {
    super(`${path}: ${detail}`)
    this.name = 'WordDataValidationError'
    this.code = code
    this.path = path
  }
}

function fail(code: WordDataErrorCode, path: string, detail: string): never {
  throw new WordDataValidationError(code, path, detail)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readRecord(value: unknown, path: string): Record<string, unknown> {
  if (!isRecord(value)) {
    fail('INVALID_FIELD', path, '객체여야 합니다.')
  }

  return value
}

function readNonEmptyString(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    fail('INVALID_FIELD', path, '비어 있지 않은 문자열이어야 합니다.')
  }

  return value.trim()
}

function readDay(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 100) {
    fail('INVALID_FIELD', path, '1부터 100 사이의 정수여야 합니다.')
  }

  return value
}

function readCategory(value: unknown, path: string): CategoryType {
  const category = CATEGORIES.find((candidate) => candidate === value)
  if (category === undefined) {
    fail('INVALID_FIELD', path, '지원하는 카테고리가 아닙니다.')
  }

  return category
}

function readPartOfSpeech(value: unknown, path: string): PartOfSpeech {
  const partOfSpeech = PARTS_OF_SPEECH.find((candidate) => candidate === value)
  if (partOfSpeech === undefined) {
    fail('INVALID_FIELD', path, '지원하는 품사가 아닙니다.')
  }

  return partOfSpeech
}

function readAnswers(
  value: unknown,
  path: string,
  normalize: (answer: string) => string,
  representativeAnswer: string,
): string[] {
  if (!Array.isArray(value)) {
    fail('INVALID_FIELD', path, '문자열 배열이어야 합니다.')
  }

  const representative = normalize(representativeAnswer)
  const normalizedAnswers = new Set<string>([representative])
  const answers: string[] = []

  value.forEach((answer, index) => {
    if (typeof answer !== 'string') {
      fail('INVALID_FIELD', `${path}[${index}]`, '문자열이어야 합니다.')
    }

    const normalized = normalize(answer)
    if (normalized === '') {
      fail('INVALID_FIELD', `${path}[${index}]`, '정규화 후 비어 있는 답안은 사용할 수 없습니다.')
    }

    if (!normalizedAnswers.has(normalized)) {
      normalizedAnswers.add(normalized)
      answers.push(answer.trim())
    }
  })

  return answers
}

function validateFilePath(value: unknown, path: string): string {
  const filePath = readNonEmptyString(value, path)
  if (
    filePath.startsWith('/') ||
    filePath.includes('\\') ||
    filePath.split('/').includes('..') ||
    /^[a-z][a-z\d+.-]*:/i.test(filePath)
  ) {
    fail('INVALID_INDEX', path, 'BASE_URL 기준의 안전한 상대경로여야 합니다.')
  }

  return filePath
}

export function validateDayIndex(value: unknown): DayIndexItem[] {
  if (!Array.isArray(value)) {
    fail('INVALID_ROOT', 'index', 'Day 인덱스는 배열이어야 합니다.')
  }

  const seenDays = new Set<number>()
  let previousDay = 0

  return value.map((entry, index) => {
    const path = `index[${index}]`
    const record = readRecord(entry, path)
    const day = readDay(record.day, `${path}.day`)

    if (seenDays.has(day)) {
      fail('DUPLICATE_DAY', `${path}.day`, `Day ${day}가 중복되었습니다.`)
    }
    if (day <= previousDay) {
      fail('INVALID_INDEX', `${path}.day`, 'Day는 오름차순으로 정렬되어야 합니다.')
    }

    if (record.wordCount !== 30) {
      fail('INVALID_INDEX', `${path}.wordCount`, '배포되는 Day는 정확히 30개여야 합니다.')
    }

    seenDays.add(day)
    previousDay = day

    return {
      day,
      category: readCategory(record.category, `${path}.category`),
      titleKo: readNonEmptyString(record.titleKo, `${path}.titleKo`),
      wordCount: 30,
      dataVersion: readNonEmptyString(record.dataVersion, `${path}.dataVersion`),
      filePath: validateFilePath(record.filePath, `${path}.filePath`),
      ...(record.language === 'ja' ? { language: 'ja' as const } : {}),
    }
  })
}

function readWord(value: unknown, path: string): WordItem {
  const record = readRecord(value, path)
  const id = readNonEmptyString(record.id, `${path}.id`)
  if (!WORD_ID_PATTERN.test(id)) {
    fail('INVALID_WORD', `${path}.id`, 'ID는 w0001부터 w3000 형식이어야 합니다.')
  }

  const word = readNonEmptyString(record.word, `${path}.word`)
  const meaning = readNonEmptyString(record.meaning, `${path}.meaning`)
  const language = record.language === 'ja' ? 'ja' : 'en'
  const normalizeTarget = language === 'ja' ? normalizeJapanese : normalizeEnglish
  const normalizedWord = normalizeTarget(word)
  const normalizedMeaning = normalizeKorean(meaning)

  if (normalizedWord === '' || normalizedMeaning === '') {
    fail('INVALID_WORD', path, '대표 답안은 정규화 후에도 비어 있지 않아야 합니다.')
  }

  return {
    id,
    day: readDay(record.day, `${path}.day`),
    category: readCategory(record.category, `${path}.category`),
    word,
    meaning,
    pronunciation: readNonEmptyString(record.pronunciation, `${path}.pronunciation`),
    partOfSpeech: readPartOfSpeech(record.partOfSpeech, `${path}.partOfSpeech`),
    exampleEn: readNonEmptyString(record.exampleEn, `${path}.exampleEn`),
    ...(language === 'ja'
      ? { examplePronunciation: readNonEmptyString(record.examplePronunciation, `${path}.examplePronunciation`) }
      : {}),
    exampleKo: readNonEmptyString(record.exampleKo, `${path}.exampleKo`),
    acceptableAnswersKo: readAnswers(
      record.acceptableAnswersKo,
      `${path}.acceptableAnswersKo`,
      normalizeKorean,
      meaning,
    ),
    acceptableAnswersEn: readAnswers(
      record.acceptableAnswersEn,
      `${path}.acceptableAnswersEn`,
      normalizeTarget,
      word,
    ),
    ...(language === 'ja' ? { language } : {}),
  }
}

function validateAnswerCollisions(words: WordItem[]): void {
  try {
    assertNoAnswerCollisions(words, 'ko-to-en')
    assertNoAnswerCollisions(words, 'en-to-ko')
  } catch (error) {
    if (error instanceof TextMatcherError) {
      fail('ANSWER_COLLISION', 'words', error.message)
    }
    throw error
  }
}

export function validateWordItems(value: unknown, dayIndex: DayIndexItem): WordItem[] {
  if (!Array.isArray(value)) {
    fail('INVALID_ROOT', `day[${dayIndex.day}]`, 'Day 데이터는 배열이어야 합니다.')
  }
  if (value.length !== dayIndex.wordCount) {
    fail(
      'WORD_COUNT_MISMATCH',
      `day[${dayIndex.day}]`,
      `인덱스는 ${dayIndex.wordCount}개지만 실제 데이터는 ${value.length}개입니다.`,
    )
  }

  const seenIds = new Set<string>()
  const words = value.map((entry, index) => {
    const word = readWord(entry, `day[${dayIndex.day}][${index}]`)

    if (seenIds.has(word.id)) {
      fail('DUPLICATE_WORD_ID', `day[${dayIndex.day}][${index}].id`, `${word.id}가 중복되었습니다.`)
    }
    if (word.day !== dayIndex.day) {
      fail('DAY_MISMATCH', `day[${dayIndex.day}][${index}].day`, '인덱스의 Day와 일치하지 않습니다.')
    }
    if (word.category !== dayIndex.category) {
      fail(
        'CATEGORY_MISMATCH',
        `day[${dayIndex.day}][${index}].category`,
        '인덱스의 카테고리와 일치하지 않습니다.',
      )
    }
    if ((word.language ?? 'en') !== (dayIndex.language ?? 'en')) {
      fail('INVALID_WORD', `day[${dayIndex.day}][${index}].language`, '인덱스의 언어와 일치하지 않습니다.')
    }

    seenIds.add(word.id)
    return word
  })

  validateAnswerCollisions(words)
  return words
}

export function validateWordDataset(
  indexValue: unknown,
  dayDataByDay: ReadonlyMap<number, unknown>,
): Map<number, WordItem[]> {
  const index = validateDayIndex(indexValue)
  const result = new Map<number, WordItem[]>()
  const globalIds = new Set<string>()

  index.forEach((dayIndex) => {
    if (!dayDataByDay.has(dayIndex.day)) {
      fail('MISSING_DAY_DATA', `day[${dayIndex.day}]`, '인덱스에 대응하는 Day 데이터가 없습니다.')
    }

    const words = validateWordItems(dayDataByDay.get(dayIndex.day), dayIndex)
    words.forEach((word) => {
      if (globalIds.has(word.id)) {
        fail('DUPLICATE_WORD_ID', `day[${dayIndex.day}]`, `${word.id}가 전체 데이터셋에서 중복되었습니다.`)
      }
      globalIds.add(word.id)
    })
    result.set(dayIndex.day, words)
  })

  return result
}
