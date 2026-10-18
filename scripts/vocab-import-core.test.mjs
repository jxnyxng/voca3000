import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { writeVocabularyData } from './vocab-import-core.mjs'

const temporaryDirectories = []

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, {
    recursive: true,
    force: true,
  })))
})

async function temporaryDirectory() {
  const directory = await mkdtemp(join(tmpdir(), 'voca-import-test-'))
  temporaryDirectories.push(directory)
  return directory
}

function makeWords(overrides = {}) {
  return Array.from({ length: 30 }, (_, index) => ({
    id: `w${String(index + 1).padStart(4, '0')}`,
    day: 1,
    category: 'Daily Life',
    word: `word-${index + 1}`,
    ...overrides,
  }))
}

describe('writeVocabularyData', () => {
  it('writes deterministic Day files and an index', async () => {
    const dataDirectory = await temporaryDirectory()
    const { days, index } = await writeVocabularyData({
      words: makeWords(),
      categoryTitles: { 'Daily Life': '일상' },
      idPrefix: 'w',
      filePrefix: 'words-day',
      indexFileName: 'words-index.json',
      dataDirectory,
    })

    expect(days).toEqual([1])
    expect(index).toEqual([{
      day: 1,
      category: 'Daily Life',
      titleKo: '일상',
      wordCount: 30,
      dataVersion: '1.0.0',
      filePath: 'data/words-day01.json',
    }])
    expect(JSON.parse(await readFile(join(dataDirectory, 'words-day01.json'), 'utf8'))).toEqual(makeWords())
    expect(JSON.parse(await readFile(join(dataDirectory, 'words-index.json'), 'utf8'))).toEqual(index)
  })

  it('rejects invalid counts, IDs, categories, and language-specific validation', async () => {
    const baseOptions = {
      categoryTitles: { 'Daily Life': '일상' },
      idPrefix: 'w',
      filePrefix: 'words-day',
      indexFileName: 'words-index.json',
    }

    await expect(writeVocabularyData({
      ...baseOptions,
      words: makeWords().slice(0, 29),
      dataDirectory: await temporaryDirectory(),
    })).rejects.toThrow('정확히 30개가 필요합니다')

    await expect(writeVocabularyData({
      ...baseOptions,
      words: makeWords({ id: 'wrong' }),
      dataDirectory: await temporaryDirectory(),
    })).rejects.toThrow('w0001여야 합니다')

    await expect(writeVocabularyData({
      ...baseOptions,
      words: makeWords().map((word, index) => index === 29 ? { ...word, category: 'Other' } : word),
      dataDirectory: await temporaryDirectory(),
    })).rejects.toThrow('카테고리가 일치하지 않습니다')

    await expect(writeVocabularyData({
      ...baseOptions,
      words: makeWords(),
      dataDirectory: await temporaryDirectory(),
      validateWord: () => { throw new Error('언어 검증 실패') },
    })).rejects.toThrow('언어 검증 실패')
  })
})
