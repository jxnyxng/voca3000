import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { writeVocabularyData } from './vocab-import-core.mjs'

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
  'Home & Household': '가정과 집안일',
  'Relationships & Communication': '인간관계와 소통',
  'Café & Coffee Culture': '카페와 커피 문화',
  'Emotions & Personality': '감정과 성격',
  'Troubles & Emergencies': '문제와 긴급 상황',
  'Post Office & Bank': '우체국과 은행',
  'Clothing & Style': '의류와 스타일',
  'Digital Life & Smartphone': '디지털 생활과 스마트폰',
  'Body Parts & Gestures': '신체 부위와 몸짓',
  'Hobbies & Pastimes': '취미와 여가',
  'Campus & Student Life': '캠퍼스와 학생 생활',
  'Cooking & Food Texture': '요리와 음식 식감',
  'Housing & Neighborhood': '주거와 이웃',
  'Traditional Culture & Customs': '전통문화와 관습',
  'Office Tech & Remote Work': '사무 기술과 원격 근무',
  'Daily Routine & Habits': '일상 루틴과 습관',
  'Appearance & Descriptions': '외모와 묘사',
  'Social Slang & Casual Talk': '사회적 속어와 일상 대화',
  'Business Manners & Meetings': '비즈니스 예절과 회의',
  'Travel Navigation & Sightseeing Tips': '여행 길 찾기와 관광 팁',
  'Car & Driving': '자동차와 운전',
  'Pets & Animal Life': '반려동물과 동물 생활',
  'Beauty, Salon & Body Care': '미용실과 신체 관리',
  'Outdoors & Camping Nature': '야외 활동과 캠핑',
  'Decisions & Daily Dilemmas': '결정과 일상의 고민',
  'Supermarket & Grocery Shopping': '마트와 식료품 쇼핑',
  'Neighborhood & Public Administration': '지역사회와 행정 업무',
  'Fitness, Workout & Sports': '운동과 스포츠',
  'Seasons & Traditional Festivities': '계절과 전통 행사',
  'Train Journeys & Local Sightseeing': '기차 여행과 지역 관광',
  'Pharmacy & Minor Symptoms': '약국과 가벼운 증상',
  'Interior, Furniture & DIY': '인테리어와 가구·DIY',
  'Disaster Preparedness & Safety': '재난 대비와 안전',
  'City Transit & Bicycle': '도시 교통과 자전거',
  'Conversational Nuances & Empathy': '대화의 뉘앙스와 공감',
  'Consumer Electronics & Appliances': '전자제품과 가전',
  'Work Dynamics & Collaboration': '직장 관계와 협업',
  'Social Gatherings & Dining Out': '모임과 외식',
  'Ecology & Climate Awareness': '생태와 기후 인식',
  'Mindset, Growth & Life Philosophy': '마음가짐과 성장·인생관',
}

const words = (await Promise.all(sourcePaths.map(async (sourcePath) => {
  const parsed = JSON.parse(await readFile(sourcePath, 'utf8'))
  if (!Array.isArray(parsed)) throw new Error(`${sourcePath}의 최상위 데이터는 배열이어야 합니다.`)
  return parsed
}))).flat()
const { days } = await writeVocabularyData({
  words,
  categoryTitles,
  idPrefix: 'j',
  filePrefix: 'japanese-words-day',
  indexFileName: 'japanese-words-index.json',
  indexFields: { language: 'ja' },
  validateWord(word) {
    if (word.language !== 'ja') throw new Error(`${word.id}의 language는 ja여야 합니다.`)
  },
})
console.log(`일본어 단어 ${words.length}개를 Day ${days.join(', ')}에 반영했습니다.`)
