import { describe, expect, it } from 'vitest'
import day01Data from '../../public/data/words-day01.json'
import indexData from '../../public/data/words-index.json'
import { validateWordDataset } from '../utils/validators'

describe('deployed word data', () => {
  const dataset = validateWordDataset(indexData, new Map([[1, day01Data]]))
  const day01 = dataset.get(1) ?? []

  it('registers only the complete Day 01 file', () => {
    expect(indexData).toEqual([
      {
        day: 1,
        category: 'Daily Life',
        titleKo: '일상과 루틴',
        wordCount: 30,
        dataVersion: '1.0.0',
        filePath: 'data/words-day01.json',
      },
    ])
    expect(day01).toHaveLength(30)
  })

  it('uses sequential IDs from w0001 through w0030', () => {
    expect(day01.map(({ id }) => id)).toEqual(
      Array.from({ length: 30 }, (_, index) => `w${String(index + 1).padStart(4, '0')}`),
    )
  })

  it('includes the target expression in every English example', () => {
    day01.forEach(({ exampleEn, id, word }) => {
      expect(exampleEn.toLocaleLowerCase('en-US'), id).toContain(
        word.toLocaleLowerCase('en-US'),
      )
    })
  })

  it('provides slash-delimited IPA and non-empty Korean translations', () => {
    day01.forEach(({ exampleKo, id, pronunciation }) => {
      expect(pronunciation, id).toMatch(/^\/.+\/$/)
      expect(exampleKo.trim(), id).not.toBe('')
    })
  })
})
