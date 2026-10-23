import { describe, expect, it } from 'vitest'
import type { WordItem } from '../types/word'
import {
  assertNoAnswerCollisions,
  buildAnswerComparisonKey,
  buildAcceptedAnswerSet,
  evaluateQuizAnswer,
  normalizeEnglish,
  normalizeJapanese,
  normalizeKorean,
  TextMatcherError,
} from '../utils/textMatcher'

function createWord(overrides: Partial<WordItem> = {}): WordItem {
  return {
    id: 'w0001',
    day: 1,
    category: 'Daily Life',
    word: 'tidy up',
    meaning: '정리하다',
    pronunciation: '/ˈtaɪdi ʌp/',
    partOfSpeech: 'phrase',
    exampleEn: 'I tidy up the kitchen.',
    exampleKo: '나는 부엌을 정리한다.',
    acceptableAnswersKo: ['정돈하다'],
    acceptableAnswersEn: ['straighten up'],
    ...overrides,
  }
}

describe('text normalization', () => {
  it('normalizes Korean compatibility characters, spaces, and punctuation', () => {
    expect(normalizeKorean('  정리 하다!? ')).toBe('정리하다')
    expect(normalizeKorean('［출퇴근］')).toBe('출퇴근')
  })

  it('normalizes English case, full-width characters, whitespace, and curly apostrophes', () => {
    expect(normalizeEnglish('  ＴＩＤＹ   UP  ')).toBe('tidy up')
    expect(normalizeEnglish('DON’T   rush')).toBe("don't rush")
  })

  it('preserves apostrophes and hyphens rather than guessing omitted forms', () => {
    expect(normalizeEnglish("don't")).toBe("don't")
    expect(normalizeEnglish('dont')).toBe('dont')
    expect(normalizeEnglish('well-being')).toBe('well-being')
    expect(normalizeEnglish('wellbeing')).toBe('wellbeing')
  })

  it('normalizes Japanese width, spaces, and punctuation without removing the script', () => {
    expect(normalizeJapanese('  ありがとう ございます。 ')).toBe('ありがとうございます')
    expect(normalizeJapanese('コンニチハ！')).toBe('コンニチハ')
  })

  it('builds forgiving quiz-only keys without changing canonical normalizers', () => {
    expect(buildAnswerComparisonKey('well-being', 'en')).toBe('well-being')
    expect(buildAnswerComparisonKey("don't rush", 'en')).toBe("don't rush")
    expect(buildAnswerComparisonKey('아리가토-고자이마스', 'ja')).toBe('아리가토고자이마스')
    expect(buildAnswerComparisonKey('정리-하다', 'ko')).toBe('정리하다')
    expect(normalizeEnglish('well-being')).toBe('well-being')
  })
})

describe('quiz answer evaluation', () => {
  it('accepts representative and explicitly allowed English answers', () => {
    const word = createWord()

    expect(evaluateQuizAnswer(' TIDY   UP ', word, 'ko-to-en').isCorrect).toBe(true)
    expect(evaluateQuizAnswer('straighten up', word, 'ko-to-en').isCorrect).toBe(true)
  })

  it('accepts representative, allowed, and optional-hada Korean answers', () => {
    const word = createWord()

    expect(evaluateQuizAnswer('정리하다', word, 'en-to-ko').isCorrect).toBe(true)
    expect(evaluateQuizAnswer('정돈하다', word, 'en-to-ko').isCorrect).toBe(true)
    expect(evaluateQuizAnswer('정리', word, 'en-to-ko').isCorrect).toBe(true)
    expect(evaluateQuizAnswer('정돈', word, 'en-to-ko').isCorrect).toBe(true)
  })

  it('rejects partial substrings and unlisted synonyms', () => {
    const word = createWord()

    expect(evaluateQuizAnswer('tidy', word, 'ko-to-en').isCorrect).toBe(false)
    expect(evaluateQuizAnswer('clean up', word, 'ko-to-en').isCorrect).toBe(false)
    expect(evaluateQuizAnswer('정', word, 'en-to-ko').isCorrect).toBe(false)
  })

  it('rejects empty, punctuation-only, one-letter, and hada-only input', () => {
    const word = createWord()

    expect(evaluateQuizAnswer('', word, 'ko-to-en').isCorrect).toBe(false)
    expect(evaluateQuizAnswer('...!?', word, 'ko-to-en').isCorrect).toBe(false)
    expect(evaluateQuizAnswer('가', word, 'en-to-ko').isCorrect).toBe(false)
    expect(evaluateQuizAnswer('하다', word, 'en-to-ko').isCorrect).toBe(false)
  })

  it('applies the hada rule only after exact matching and only to a final suffix', () => {
    const commute = createWord({
      word: 'commute',
      meaning: '출퇴근하다',
      acceptableAnswersKo: ['통근하다'],
      acceptableAnswersEn: [],
    })

    expect(evaluateQuizAnswer('출퇴근', commute, 'en-to-ko').isCorrect).toBe(true)
    expect(evaluateQuizAnswer('통근', commute, 'en-to-ko').isCorrect).toBe(true)
    expect(evaluateQuizAnswer('출퇴근되다', commute, 'en-to-ko').isCorrect).toBe(false)
  })

  it('keeps meaningful English apostrophe and hyphen variants explicit', () => {
    const word = createWord({
      word: "don't rush",
      acceptableAnswersEn: ['dont rush', 'well-being'],
    })

    expect(evaluateQuizAnswer('DON’T RUSH', word, 'ko-to-en').isCorrect).toBe(true)
    expect(evaluateQuizAnswer('dont rush', word, 'ko-to-en').isCorrect).toBe(true)
    expect(evaluateQuizAnswer('wellbeing', word, 'ko-to-en').isCorrect).toBe(false)
    expect(evaluateQuizAnswer('well being', word, 'ko-to-en').isCorrect).toBe(false)
    expect(evaluateQuizAnswer('well-being', word, 'ko-to-en').isCorrect).toBe(true)
  })

  it('evaluates Japanese target answers with Japanese normalization', () => {
    const word = createWord({
      id: 'j0001',
      language: 'ja',
      word: 'ありがとうございます',
      meaning: '감사합니다',
      pronunciation: '아리가토 고자이마스',
      acceptableAnswersEn: ['ありがとう ございます'],
    })

    expect(evaluateQuizAnswer('ありがとう ございます。', word, 'ko-to-en').isCorrect).toBe(true)
    expect(evaluateQuizAnswer('아리가토 고자이마스', word, 'ko-to-en').isCorrect).toBe(true)
    expect(evaluateQuizAnswer('아리가토-고자이마스', word, 'ko-to-en').isCorrect).toBe(true)
    expect(evaluateQuizAnswer('아리가토·고자이마스', word, 'ko-to-en').isCorrect).toBe(true)
    expect(evaluateQuizAnswer('아리가토고자이마스!', word, 'ko-to-en').isCorrect).toBe(true)
    expect(evaluateQuizAnswer('ありがとう', word, 'ko-to-en').isCorrect).toBe(false)
  })

  it('accepts safe Korean transcription variants without relaxing consonants', () => {
    const daijobu = createWord({
      id: 'j0009',
      language: 'ja',
      word: '大丈夫',
      meaning: '괜찮음',
      pronunciation: '다이죠-부',
      acceptableAnswersEn: ['だいじょうぶ'],
    })
    const tomodachi = createWord({
      id: 'j0022',
      language: 'ja',
      word: '友達',
      meaning: '친구',
      pronunciation: '토모다치',
      acceptableAnswersEn: ['ともだち'],
    })

    expect(evaluateQuizAnswer('다이죠부', daijobu, 'ko-to-en').isCorrect).toBe(true)
    expect(evaluateQuizAnswer('다이조부', daijobu, 'ko-to-en').isCorrect).toBe(true)
    expect(evaluateQuizAnswer('토모다치', tomodachi, 'ko-to-en').isCorrect).toBe(true)
    expect(evaluateQuizAnswer('도모다치', tomodachi, 'ko-to-en').isCorrect).toBe(false)
  })

  it('rejects an answer set that normalizes to empty', () => {
    const invalidWord = createWord({
      word: '...',
      acceptableAnswersEn: ['!?'],
    })

    expect(() => buildAcceptedAnswerSet(invalidWord, 'ko-to-en')).toThrow(TextMatcherError)
  })
})

describe('answer collision detection', () => {
  it('detects answers shared by different words after normalization', () => {
    const first = createWord({ id: 'w0001', word: 'tidy up' })
    const second = createWord({
      id: 'w0002',
      word: 'straighten',
      acceptableAnswersEn: [' TIDY   UP '],
    })

    expect(() => assertNoAnswerCollisions([first, second], 'ko-to-en')).toThrow(
      /w0001 and w0002/,
    )
  })

  it('checks Korean answer sets independently from English answer sets', () => {
    const first = createWord({ id: 'w0001', meaning: '정리하다', acceptableAnswersKo: [] })
    const second = createWord({
      id: 'w0002',
      meaning: '치우다',
      acceptableAnswersKo: [' 정리 하다 '],
    })

    expect(() => assertNoAnswerCollisions([first, second], 'en-to-ko')).toThrow(
      TextMatcherError,
    )
  })
})
