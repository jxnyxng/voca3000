import type { QuizMode } from './word'

export type QuizResult = 'correct' | 'incorrect'

export interface UserProgressRecord {
  wordId: string
  isMastered: boolean
  correctCountKoToEn: number
  incorrectCountKoToEn: number
  correctCountEnToKo: number
  incorrectCountEnToKo: number
  lastResultKoToEn?: QuizResult
  lastResultEnToKo?: QuizResult
  lastStudiedAt: string
}

export interface DaySessionSummary {
  day: number
  completedStudy: boolean
  koToEnHighScore: number
  enToKoHighScore: number
  lastAttemptAtKoToEn?: string
  lastAttemptAtEnToKo?: string
}

export type IncorrectProgressFilter = QuizMode | 'all'
