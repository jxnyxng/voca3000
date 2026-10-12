import { describe, expect, it } from 'vitest'
import type { DayIndexItem, WordItem } from '../types/word'
import {
  validateDayIndex,
  validateWordDataset,
  validateWordItems,
  WordDataValidationError,
} from '../utils/validators'

const dayIndex: DayIndexItem = {
  day: 1,
  category: 'Daily Life',
  titleKo: '일상과 루틴',
  wordCount: 30,
  dataVersion: '1.0.0',
  filePath: 'data/words-day01.json',
}

function createWord(position: number, overrides: Partial<WordItem> = {}): WordItem {
  const idNumber = String(position).padStart(4, '0')

  return {
    id: `w${idNumber}`,
    day: 1,
    category: 'Daily Life',
    word: `word ${position}`,
    meaning: `뜻 ${position}`,
    pronunciation: `/wɝːd ${position}/`,
    partOfSpeech: 'noun',
    exampleEn: `This example uses word ${position}.`,
    exampleKo: `이 예문은 단어 ${position}을 사용한다.`,
    acceptableAnswersKo: [],
    acceptableAnswersEn: [],
    ...overrides,
  }
}

function createDay(overrides: Partial<WordItem> = {}): WordItem[] {
  return Array.from({ length: 30 }, (_, index) =>
    createWord(index + 1, index === 0 ? overrides : {}),
  )
}

function expectValidationError(action: () => unknown, code: string): void {
  try {
    action()
  } catch (error) {
    expect(error).toBeInstanceOf(WordDataValidationError)
    if (error instanceof WordDataValidationError) {
      expect(error.code).toBe(code)
      expect(error.userMessage).not.toContain(error.message)
    }
    return
  }

  throw new Error(`Expected ${code} validation error`)
}

describe('validateDayIndex', () => {
  it('accepts a valid, ordered index', () => {
    expect(validateDayIndex([dayIndex])).toEqual([dayIndex])
  })

  it('rejects a non-array root', () => {
    expectValidationError(() => validateDayIndex({ day: 1 }), 'INVALID_ROOT')
  })

  it('rejects duplicate and unordered days', () => {
    expectValidationError(() => validateDayIndex([dayIndex, dayIndex]), 'DUPLICATE_DAY')

    expectValidationError(
      () =>
        validateDayIndex([
          { ...dayIndex, day: 2, filePath: 'data/words-day02.json' },
          dayIndex,
        ]),
      'INVALID_INDEX',
    )
  })

  it('rejects incomplete days and unsafe paths', () => {
    expectValidationError(
      () => validateDayIndex([{ ...dayIndex, wordCount: 29 }]),
      'INVALID_INDEX',
    )
    expectValidationError(
      () => validateDayIndex([{ ...dayIndex, filePath: '/data/words-day01.json' }]),
      'INVALID_INDEX',
    )
  })
})

describe('validateWordItems', () => {
  it('accepts 30 valid words and removes normalized answer duplicates', () => {
    const words = createDay({
      word: 'tidy up',
      meaning: '정리하다',
      acceptableAnswersEn: [' TIDY   UP ', 'straighten up'],
      acceptableAnswersKo: ['정리 하다', '정돈하다'],
    })

    const result = validateWordItems(words, dayIndex)

    expect(result).toHaveLength(30)
    expect(result[0]?.acceptableAnswersEn).toEqual(['straighten up'])
    expect(result[0]?.acceptableAnswersKo).toEqual(['정돈하다'])
  })

  it('rejects an incorrect count, duplicate ID, day, and category', () => {
    expectValidationError(() => validateWordItems(createDay().slice(0, 29), dayIndex), 'WORD_COUNT_MISMATCH')

    const duplicateIds = createDay()
    duplicateIds[1] = { ...duplicateIds[1]!, id: 'w0001' }
    expectValidationError(() => validateWordItems(duplicateIds, dayIndex), 'DUPLICATE_WORD_ID')

    expectValidationError(
      () => validateWordItems(createDay({ day: 2 }), dayIndex),
      'DAY_MISMATCH',
    )
    expectValidationError(
      () => validateWordItems(createDay({ category: 'Work & Campus' }), dayIndex),
      'CATEGORY_MISMATCH',
    )
  })

  it('rejects invalid IDs, required strings, enums, and normalized-empty answers', () => {
    expectValidationError(
      () => validateWordItems(createDay({ id: 'word-1' }), dayIndex),
      'INVALID_WORD',
    )
    expectValidationError(
      () => validateWordItems(createDay({ exampleEn: '   ' }), dayIndex),
      'INVALID_FIELD',
    )
    const wordsWithInvalidPart: unknown[] = [...createDay()]
    wordsWithInvalidPart[0] = { ...createWord(1), partOfSpeech: 'person' }
    expectValidationError(
      () => validateWordItems(wordsWithInvalidPart, dayIndex),
      'INVALID_FIELD',
    )

    const wordsWithEmptyAnswer: unknown[] = [...createDay()]
    wordsWithEmptyAnswer[0] = {
      ...createWord(1),
      acceptableAnswersKo: ['...'],
    }
    expectValidationError(
      () => validateWordItems(wordsWithEmptyAnswer, dayIndex),
      'INVALID_FIELD',
    )
  })

  it('detects normalized English answer collisions between words', () => {
    const words = createDay()
    words[1] = { ...words[1]!, acceptableAnswersEn: ['WORD   1'] }

    expectValidationError(() => validateWordItems(words, dayIndex), 'ANSWER_COLLISION')
  })
})

describe('validateWordDataset', () => {
  it('validates the index and all registered day files together', () => {
    const result = validateWordDataset([dayIndex], new Map([[1, createDay()]]))

    expect(result.get(1)).toHaveLength(30)
  })

  it('rejects missing day data', () => {
    expectValidationError(
      () => validateWordDataset([dayIndex], new Map()),
      'MISSING_DAY_DATA',
    )
  })

  it('detects IDs duplicated across days', () => {
    const secondIndex: DayIndexItem = {
      ...dayIndex,
      day: 2,
      category: 'Leisure & Hobbies',
      titleKo: '여가와 취미',
      filePath: 'data/words-day02.json',
    }
    const secondDay = Array.from({ length: 30 }, (_, index) =>
      createWord(index + 1, {
        day: 2,
        category: 'Leisure & Hobbies',
        word: `leisure word ${index + 1}`,
        meaning: `여가 뜻 ${index + 1}`,
      }),
    )

    expectValidationError(
      () =>
        validateWordDataset(
          [dayIndex, secondIndex],
          new Map([
            [1, createDay()],
            [2, secondDay],
          ]),
        ),
      'DUPLICATE_WORD_ID',
    )
  })
})
