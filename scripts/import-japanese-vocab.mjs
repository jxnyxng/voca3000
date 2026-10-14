import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const sourcePaths = process.argv.slice(2).map((path) => resolve(path))
if (sourcePaths.length === 0) throw new Error('일본어 단어 원본 파일을 하나 이상 지정해 주세요.')

const categoryTitles = {
  'Daily Communication': '일상 의사소통',
  'Transit & Navigation': '교통과 길 찾기',
  'Food & Dining': '음식과 외식',
  'Shopping & Convenience': '쇼핑과 편의시설',
  'Feelings & Scheduling': '감정과 일정',
  'Accommodation & Hotel': '숙박과 호텔',
  'Weather & Nature': '날씨와 자연',
  'Health & Body Condition': '건강과 몸 상태',
  'Work & Study': '업무와 학습',
  'Leisure & Sightseeing': '여가와 관광',
}

const words = (await Promise.all(sourcePaths.map(async (sourcePath) => {
  const parsed = JSON.parse(await readFile(sourcePath, 'utf8'))
  if (!Array.isArray(parsed)) throw new Error(`${sourcePath}의 최상위 데이터는 배열이어야 합니다.`)
  return parsed
}))).flat()
const grouped = Map.groupBy(words, ({ day }) => day)
const days = [...grouped.keys()].sort((left, right) => left - right)
const seenIds = new Set()

for (const day of days) {
  const dayWords = grouped.get(day)
  if (!Number.isInteger(day) || day < 1 || day > 100) throw new Error(`잘못된 Day: ${day}`)
  if (dayWords.length !== 30) throw new Error(`Day ${day}는 ${dayWords.length}개입니다. 정확히 30개가 필요합니다.`)
  const categories = new Set(dayWords.map(({ category }) => category))
  if (categories.size !== 1) throw new Error(`Day ${day}의 카테고리가 일치하지 않습니다.`)

  for (const [index, word] of dayWords.entries()) {
    const expectedId = `j${String((day - 1) * 30 + index + 1).padStart(4, '0')}`
    if (word.id !== expectedId) throw new Error(`Day ${day}의 ID ${word.id}는 ${expectedId}여야 합니다.`)
    if (seenIds.has(word.id)) throw new Error(`중복 ID: ${word.id}`)
    if (word.language !== 'ja') throw new Error(`${word.id}의 language는 ja여야 합니다.`)
    seenIds.add(word.id)
  }

  const fileName = `japanese-words-day${String(day).padStart(2, '0')}.json`
  await writeFile(resolve('public/data', fileName), `${JSON.stringify(dayWords, null, 2)}\n`)
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
    filePath: `data/japanese-words-day${String(day).padStart(2, '0')}.json`,
    language: 'ja',
  }
})

await writeFile(resolve('public/data/japanese-words-index.json'), `${JSON.stringify(index, null, 2)}\n`)
console.log(`일본어 단어 ${words.length}개를 Day ${days.join(', ')}에 반영했습니다.`)
