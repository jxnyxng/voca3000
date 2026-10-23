import type { UserProgressRecord } from '../../types/progress'
import type { WordItem } from '../../types/word'
import { builtinContentId, progressRecordId } from '../../types/content'

export const studyWords: WordItem[] = [
  {
    id: 'day01-001',
    day: 1,
    category: 'Daily Life',
    word: 'get ready',
    meaning: '준비하다',
    pronunciation: '/ɡet ˈredi/',
    partOfSpeech: 'phrase',
    exampleEn: 'I get ready before breakfast.',
    exampleKo: '나는 아침 식사 전에 준비한다.',
    acceptableAnswersKo: ['준비하다'],
    acceptableAnswersEn: ['get ready'],
  },
  {
    id: 'day01-002',
    day: 1,
    category: 'Daily Life',
    word: 'commute',
    meaning: '통근하다',
    pronunciation: '/kəˈmjuːt/',
    partOfSpeech: 'verb',
    exampleEn: 'I commute by subway.',
    exampleKo: '나는 지하철로 통근한다.',
    acceptableAnswersKo: ['통근하다'],
    acceptableAnswersEn: ['commute'],
  },
  {
    id: 'day01-003',
    day: 1,
    category: 'Daily Life',
    word: 'errand',
    meaning: '볼일',
    pronunciation: '/ˈerənd/',
    partOfSpeech: 'noun',
    exampleEn: 'I have an errand after work.',
    exampleKo: '나는 퇴근 후 볼일이 있다.',
    acceptableAnswersKo: ['볼일'],
    acceptableAnswersEn: ['errand'],
  },
]

export function createProgressRecord(
  wordId: string,
  isMastered: boolean,
): UserProgressRecord {
  const contentId = builtinContentId('en', 1)
  return {
    progressId: progressRecordId(contentId, wordId),
    contentId,
    wordId,
    isMastered,
    correctCountKoToEn: 0,
    incorrectCountKoToEn: 0,
    correctCountEnToKo: 0,
    incorrectCountEnToKo: 0,
    lastStudiedAt: '2026-10-12T00:00:00.000Z',
  }
}
