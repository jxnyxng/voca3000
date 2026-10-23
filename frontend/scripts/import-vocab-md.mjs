import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { writeVocabularyData } from './vocab-import-core.mjs'

const sourcePaths = (process.argv.slice(2).length > 0
  ? process.argv.slice(2)
  : ['english_vocab_day_1_to_5.md']).map((path) => resolve(path))
const dataDirectory = resolve('public/data')
const indexPath = resolve(dataDirectory, 'words-index.json')
const categoryTitles = {
  'Daily Life': '일상과 루틴',
  'Emotion & Feeling': '감정과 기분',
  Communication: '의사소통',
  'Work & Business': '직장과 비즈니스',
  'Travel & Transportation': '여행과 교통',
  'Social & Relationships': '관계와 교류',
  'Shopping & Money': '쇼핑과 금전',
  'Health & Body': '건강과 신체',
  'Food & Dining': '음식과 외식',
  'Entertainment & Digital Life': '여가와 디지털 생활',
  'Time & Scheduling': '시간과 일정',
  'Opinion & Agreement': '의견과 동의',
  'Home & Housing': '집과 주거',
  'Weather & Nature': '날씨와 자연',
  'Daily Problem Solving': '일상 문제 해결',
  'Hobbies & Leisure': '취미와 여가',
  'Personality & Character': '성격과 특성',
  'Campus & Learning': '학교와 학습',
  'Dating & Romance': '데이트와 연애',
  'Money & Personal Finance': '금전과 개인 재무',
  'Daily Routine & Habits': '일과와 습관',
  'Feelings & Inner State': '감정과 내면 상태',
  'Social Etiquette & Manners': '사회 예절과 매너',
  'City Life & Navigation': '도시 생활과 길 찾기',
  'Career & Professional Growth': '커리어와 직업적 성장',
  'Home Life': '가정생활',
  'Social, Entertainment & Technology': '사교·여가와 기술',
  'Technology, Media & Growth': '기술·미디어와 성장',
  'Mindset & Growth': '마인드셋과 성장',
  'Workplace Communication': '직장 내 의사소통',
  'Dining & Food Culture': '외식과 음식 문화',
  'Shopping & Style': '쇼핑과 스타일',
  'Travel & Transit': '여행과 교통',
  'Health & Fitness': '건강과 운동',
  'Daily Chat & Reactions': '일상 대화와 반응',
  'Housing & Domestic Maintenance': '주거와 생활 관리',
  'Everyday Finance & Transactions': '일상 금융과 거래',
  'Mindsets & Attitudes': '사고방식과 태도',
  'Digital Habits & Devices': '디지털 습관과 기기',
  'Emotional Expressions & Moods': '감정 표현과 기분',
  'Social Slang & Casual Talk': '사회적 속어와 일상 대화',
  'Health, Ailments & Medicine': '건강·질환과 의약',
  'Hobbies, Outdoors & Sports': '취미·야외 활동과 스포츠',
  'Media, Entertainment & Pop Culture': '미디어·엔터테인먼트와 대중문화',
  'Daily Problems': '일상 문제',
  'Workplace Relations': '직장 관계',
  'Academic & Scientific Discussion': '학술·과학 토론',
  'Diplomacy & Global Issues': '외교와 국제 이슈',
  'Art & Philosophy of Life': '예술과 삶의 철학',
}

const incomingWords = (await Promise.all(sourcePaths.map(async (sourcePath) => {
  const markdown = await readFile(sourcePath, 'utf8')
  return JSON.parse(
    markdown
      .trim()
      .replaceAll('\\[', '[')
      .replaceAll('\\]', ']')
      .replaceAll('\\~', '~'),
  )
}))).flat()

if (!Array.isArray(incomingWords)) throw new Error('최상위 데이터는 배열이어야 합니다.')

const incomingDays = new Set(incomingWords.map(({ day }) => day))
let existingIndex = []
try {
  existingIndex = JSON.parse(await readFile(indexPath, 'utf8'))
} catch (error) {
  if (error?.code !== 'ENOENT') throw error
}
const retainedWords = (await Promise.all(
  existingIndex
    .filter(({ day }) => !incomingDays.has(day))
    .map(({ filePath }) => readFile(resolve('public', filePath), 'utf8').then(JSON.parse)),
)).flat()
const words = [...retainedWords, ...incomingWords]
const { days } = await writeVocabularyData({
  words,
  categoryTitles,
  idPrefix: 'w',
  filePrefix: 'words-day',
  indexFileName: 'words-index.json',
  dataDirectory,
  validateDayWords(dayWords, day) {
    const seenWords = new Set()
    for (const word of dayWords) {
      const normalizedWord = word.word.normalize('NFKC').trim().toLowerCase()
      if (seenWords.has(normalizedWord)) throw new Error(`Day ${day}의 중복 단어: ${word.word}`)
      seenWords.add(normalizedWord)
    }
  },
})
console.log(`영어 단어 ${words.length}개를 Day ${days.join(', ')}에 반영했습니다.`)
