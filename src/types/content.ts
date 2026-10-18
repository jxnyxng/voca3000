import type { StudyLanguage, WordItem } from './word'

export type LearningContentId = string

export interface CustomSongContent {
  contentId: LearningContentId
  schemaVersion: 1
  type: 'song'
  sourceId: string
  title: string
  artist: string
  language: StudyLanguage
  words: WordItem[]
  createdAt: string
  updatedAt: string
}

export function builtinContentId(language: StudyLanguage, day: number): LearningContentId {
  return `builtin:${language}:day-${day}`
}

export function customSongContentId(sourceId: string): LearningContentId {
  return `custom:song:${sourceId}`
}

export function progressRecordId(contentId: LearningContentId, itemId: string): string {
  return `${contentId}::${itemId}`
}
