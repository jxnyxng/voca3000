export const CATEGORIES = [
  'Daily Life',
  'Leisure & Hobbies',
  'Interpersonal & Emotions',
  'Work & Campus',
  'Troubleshooting',
  'Fluency Booster',
  'Emotion & Feeling',
  'Communication',
  'Work & Business',
  'Travel & Transportation',
  'Social & Relationships',
  'Shopping & Money',
  'Health & Body',
  'Food & Dining',
  'Entertainment & Digital Life',
  'Time & Scheduling',
  'Opinion & Agreement',
  'Home & Housing',
  'Weather & Nature',
  'Daily Problem Solving',
  'Hobbies & Leisure',
  'Personality & Character',
  'Campus & Learning',
  'Dating & Romance',
  'Money & Personal Finance',
  'Daily Routine & Habits',
  'Feelings & Inner State',
  'Social Etiquette & Manners',
  'City Life & Navigation',
  'Career & Professional Growth',
  'Home Life',
  'Social, Entertainment & Technology',
  'Technology, Media & Growth',
  'Mindset & Growth',
  'Workplace Communication',
  'Dining & Food Culture',
  'Shopping & Style',
  'Travel & Transit',
  'Health & Fitness',
  'Daily Chat & Reactions',
  'Housing & Domestic Maintenance',
  'Everyday Finance & Transactions',
  'Mindsets & Attitudes',
  'Digital Habits & Devices',
  'Emotional Expressions & Moods',
  'Social Slang & Casual Talk',
  'Health, Ailments & Medicine',
  'Hobbies, Outdoors & Sports',
  'Media, Entertainment & Pop Culture',
  'Daily Problems',
  'Workplace Relations',
  'Academic & Scientific Discussion',
  'Diplomacy & Global Issues',
  'Art & Philosophy of Life',
  'Daily Communication',
  'Transit & Navigation',
  'Shopping & Convenience',
  'Feelings & Scheduling',
  'Accommodation & Hotel',
  'Health & Body Condition',
  'Work & Study',
  'Leisure & Sightseeing',
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

export type StudyLanguage = 'en' | 'ja'

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
  language?: StudyLanguage
}

export interface DayIndexItem {
  day: number
  category: CategoryType
  titleKo: string
  wordCount: number
  dataVersion: string
  filePath: string
  language?: StudyLanguage
}
