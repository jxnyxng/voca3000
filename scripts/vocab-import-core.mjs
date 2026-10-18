import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

export async function writeVocabularyData({
  words,
  categoryTitles,
  idPrefix,
  filePrefix,
  indexFileName,
  dataDirectory = resolve('public/data'),
  indexFields = {},
  validateDayWords,
  validateWord,
}) {
  const grouped = Map.groupBy(words, ({ day }) => day)
  const days = [...grouped.keys()].sort((left, right) => left - right)
  const seenIds = new Set()

  await mkdir(dataDirectory, { recursive: true })

  for (const day of days) {
    const dayWords = grouped.get(day)
    if (!Number.isInteger(day) || day < 1 || day > 100) throw new Error(`잘못된 Day: ${day}`)
    if (dayWords.length !== 30) throw new Error(`Day ${day}는 ${dayWords.length}개입니다. 정확히 30개가 필요합니다.`)

    const categories = new Set(dayWords.map(({ category }) => category))
    if (categories.size !== 1) throw new Error(`Day ${day}의 카테고리가 일치하지 않습니다.`)
    validateDayWords?.(dayWords, day)

    for (const [index, word] of dayWords.entries()) {
      const expectedId = `${idPrefix}${String((day - 1) * 30 + index + 1).padStart(4, '0')}`
      if (word.id !== expectedId) throw new Error(`Day ${day}의 ID ${word.id}는 ${expectedId}여야 합니다.`)
      if (seenIds.has(word.id)) throw new Error(`중복 ID: ${word.id}`)
      validateWord?.(word)
      seenIds.add(word.id)
    }

    const fileName = `${filePrefix}${String(day).padStart(2, '0')}.json`
    await writeFile(resolve(dataDirectory, fileName), `${JSON.stringify(dayWords, null, 2)}\n`)
  }

  const index = days.map((day) => {
    const category = grouped.get(day)[0].category
    const titleKo = categoryTitles[category]
    if (!titleKo) throw new Error(`카테고리의 한국어 제목이 없습니다: ${category}`)
    return {
      day,
      category,
      titleKo,
      wordCount: 30,
      dataVersion: '1.0.0',
      filePath: `data/${filePrefix}${String(day).padStart(2, '0')}.json`,
      ...indexFields,
    }
  })

  await writeFile(resolve(dataDirectory, indexFileName), `${JSON.stringify(index, null, 2)}\n`)
  return { days, index }
}
