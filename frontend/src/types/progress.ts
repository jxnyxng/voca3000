import type { QuizMode } from './word'
import type { LearningContentId } from './content'

export type QuizResult = 'correct' | 'incorrect'

export interface UserProgressRecord {
  progressId: string
  contentId: LearningContentId
  wordId: string
  isMastered: boolean
  isFavorite?: boolean
  correctCountKoToEn: number
  incorrectCountKoToEn: number
  correctCountEnToKo: number
  incorrectCountEnToKo: number
  lastResultKoToEn?: QuizResult
  lastResultEnToKo?: QuizResult
  lastStudiedAt: string
}

export interface DaySessionSummary {
  contentId: LearningContentId
  completedStudy: boolean
  koToEnHighScore: number
  enToKoHighScore: number
  lastAttemptAtKoToEn?: string
  lastAttemptAtEnToKo?: string
}

export type IncorrectProgressFilter = QuizMode | 'all'
