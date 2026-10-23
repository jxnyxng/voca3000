import { describe, expect, it } from 'vitest'
import indexData from '../../public/data/words-index.json'
import japaneseIndexData from '../../public/data/japanese-words-index.json'
import { findTargetExpression } from '../components/study/findTargetExpression'
import { validateWordDataset } from '../utils/validators'

describe('deployed word data', () => {
  const dayModules = import.meta.glob('../../public/data/words-day*.json', {
    eager: true,
    import: 'default',
  })
  const dayData = new Map(
    Object.entries(dayModules).map(([path, words]) => {
      const day = Number(path.match(/words-day(\d+)\.json$/)?.[1])
      return [day, words]
    }),
  )
  const dataset = validateWordDataset(indexData, dayData)
  const allWords = [...dataset.values()].flat()

  it('registers fifty complete English Days', () => {
    expect(indexData).toHaveLength(50)
    expect(indexData.map(({ day }) => day)).toEqual(
      Array.from({ length: 50 }, (_, index) => index + 1),
    )
    expect([...dataset.values()].every((words) => words.length === 30)).toBe(true)
  })

  it('uses sequential IDs from w0001 through w1500', () => {
    expect(allWords.map(({ id }) => id)).toEqual(
      Array.from({ length: 1500 }, (_, index) => `w${String(index + 1).padStart(4, '0')}`),
    )
  })

  it('includes the target expression in every English example', () => {
    allWords.forEach(({ exampleEn, id, word }) => {
      expect(exampleEn.toLocaleLowerCase('en-US'), id).toContain(
        word.toLocaleLowerCase('en-US'),
      )
    })
  })

  it('provides slash-delimited IPA and non-empty Korean translations', () => {
    allWords.forEach(({ exampleKo, id, pronunciation }) => {
      expect(pronunciation, id).toMatch(/^\/.+\/$/)
      expect(exampleKo.trim(), id).not.toBe('')
    })
  })
})

describe('deployed Japanese word data', () => {
  const dayModules = import.meta.glob('../../public/data/japanese-words-day*.json', {
    eager: true,
    import: 'default',
  })
  const dataset = validateWordDataset(
    japaneseIndexData,
    new Map(Object.entries(dayModules).map(([path, words]) => {
      const day = Number(path.match(/japanese-words-day(\d+)\.json$/)?.[1])
      return [day, words]
    })),
  )
  const allWords = [...dataset.values()].flat()

  it('registers fifty complete Japanese Days with sequential language-specific IDs', () => {
    expect(japaneseIndexData).toHaveLength(50)
    expect(japaneseIndexData.map(({ day }) => day)).toEqual(
      Array.from({ length: 50 }, (_, index) => index + 1),
    )
    expect([...dataset.values()].every((words) => words.length === 30)).toBe(true)
    expect(allWords.map(({ id }) => id)).toEqual(
      Array.from({ length: 1500 }, (_, index) => `j${String(index + 1).padStart(4, '0')}`),
    )
    expect(allWords.every(({ language }) => language === 'ja')).toBe(true)
  })

  it('provides Korean pronunciation and non-empty Japanese examples', () => {
    allWords.forEach(({ exampleEn, examplePronunciation, id, pronunciation }) => {
      expect(pronunciation.trim(), id).not.toBe('')
      expect(pronunciation, id).toMatch(/[가-힣]/)
      expect(exampleEn.trim(), id).not.toBe('')
      expect(examplePronunciation?.trim(), id).not.toBe('')
      expect(examplePronunciation, id).toMatch(/[가-힣]/)
    })
  })

  it('can mask only the answer expression in every Japanese example', () => {
    allWords.forEach(({ acceptableAnswersEn, exampleEn, id, word }) => {
      const match = findTargetExpression(exampleEn, [word, ...acceptableAnswersEn])
      expect(match, id).not.toBeNull()
      expect(match?.match.length, id).toBeGreaterThan(0)
      expect(`${match?.before}${match?.match}${match?.after}`, id).toBe(exampleEn)
    })
  })

  it('loads the replacement Day 01 source', () => {
    expect(dataset.get(1)?.[0]).toMatchObject({
      id: 'j0001',
      word: 'ありがとうございます',
      pronunciation: '아리가토-고자이마스',
    })
  })
})
