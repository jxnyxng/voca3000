export const CATEGORIES = [
  'Daily Life',
  'Leisure & Hobbies',
  'Interpersonal & Emotions',
  'Work & Campus',
  'Troubleshooting',
  'Fluency Booster',
] as const

export type CategoryType = (typeof CATEGORIES)[number]

export const QUIZ_MODES = ['ko-to-en', 'en-to-ko'] as const

export type QuizMode = (typeof QUIZ_MODES)[number]

export const PARTS_OF_SPEECH = [
  'verb',
  'noun',
  'adjective',
  'adverb',
  'phrase',
] as const

export type PartOfSpeech = (typeof PARTS_OF_SPEECH)[number]

export interface WordItem {
  id: string
  day: number
  category: CategoryType
  word: string
  meaning: string
  pronunciation: string
  partOfSpeech: PartOfSpeech
  exampleEn: string
  exampleKo: string
  acceptableAnswersKo: string[]
  acceptableAnswersEn: string[]
}

export interface DayIndexItem {
  day: number
  category: CategoryType
  titleKo: string
  wordCount: number
  dataVersion: string
  filePath: string
}
