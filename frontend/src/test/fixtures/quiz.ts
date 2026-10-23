import type { WordItem } from '../../types/word'

export const quizWords: WordItem[] = [
  {
    id: 'w0001',
    day: 1,
    category: 'Daily Life',
    word: 'commute',
    meaning: '출퇴근하다',
    pronunciation: '/kəˈmjuːt/',
    partOfSpeech: 'verb',
    exampleEn: 'I commute by subway.',
    exampleKo: '나는 지하철로 출퇴근한다.',
    acceptableAnswersKo: ['통근하다'],
    acceptableAnswersEn: [],
  },
  {
    id: 'w0002',
    day: 1,
    category: 'Daily Life',
    word: 'errand',
    meaning: '볼일',
    pronunciation: '/ˈerənd/',
    partOfSpeech: 'noun',
    exampleEn: 'I need to run an errand.',
    exampleKo: '나는 볼일을 봐야 한다.',
    acceptableAnswersKo: ['심부름'],
    acceptableAnswersEn: [],
  },
]
