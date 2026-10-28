import Dexie, { type Table } from 'dexie'
import type {
  DaySessionSummary,
  IncorrectProgressFilter,
  UserProgressRecord,
} from '../types/progress'
import type { QuizMode } from '../types/word'
import { progressRecordId, type LearningContentId } from '../types/content'
import type { CustomSongContent } from '../types/content'

const DATABASE_NAME = 'Voca3000DB-v2'

export class VocaDatabase extends Dexie {
  progress!: Table<UserProgressRecord, string>
  daySessions!: Table<DaySessionSummary, string>
  customContents!: Table<CustomSongContent, string>

  constructor(name = DATABASE_NAME) {
    super(name)
    this.version(1).stores({
      progress: 'progressId, contentId, wordId, isMastered, lastResultKoToEn, lastResultEnToKo, lastStudiedAt',
      daySessions: 'contentId, completedStudy, koToEnHighScore, enToKoHighScore',
    })
    this.version(2).stores({
      progress: 'progressId, contentId, wordId, isMastered, lastResultKoToEn, lastResultEnToKo, lastStudiedAt',
      daySessions: 'contentId, completedStudy, koToEnHighScore, enToKoHighScore',
      customContents: 'contentId, type, language, updatedAt',
    })
  }
}

export const db = new VocaDatabase()

export async function saveCustomSong(
  content: CustomSongContent,
  database: VocaDatabase = db,
): Promise<void> {
  await database.customContents.put(content)
}

export async function getCustomSongs(
  database: VocaDatabase = db,
): Promise<CustomSongContent[]> {
  return database.customContents.orderBy('updatedAt').reverse().toArray()
}

export async function deleteCustomSong(
  contentId: LearningContentId,
  database: VocaDatabase = db,
): Promise<void> {
  requireContentId(contentId)
  await database.transaction(
    'rw',
    database.customContents,
    database.progress,
    database.daySessions,
    async () => {
      await database.customContents.delete(contentId)
      await database.progress.where('contentId').equals(contentId).delete()
      await database.daySessions.delete(contentId)
    },
  )
}

function requireContentId(contentId: LearningContentId): void {
  if (typeof contentId !== 'string' || contentId.trim() === '') {
    throw new TypeError('contentId must be a non-empty string.')
  }
}

function requireWordId(wordId: string): void {
  if (typeof wordId !== 'string' || wordId.trim() === '') {
    throw new TypeError('wordId must be a non-empty string.')
  }
}

function requireScore(score: number): void {
  if (!Number.isFinite(score) || !Number.isInteger(score) || score < 0 || score > 100) {
    throw new RangeError('score must be an integer from 0 to 100.')
  }
}

function requireQuizMode(mode: QuizMode): void {
  if (mode !== 'ko-to-en' && mode !== 'en-to-ko') {
    throw new TypeError(`Unsupported quiz mode: ${String(mode)}.`)
  }
}

function createProgress(contentId: LearningContentId, wordId: string, now: string): UserProgressRecord {
  return {
    progressId: progressRecordId(contentId, wordId),
    contentId,
    wordId,
    isMastered: false,
    isFavorite: false,
    correctCountKoToEn: 0,
    incorrectCountKoToEn: 0,
    correctCountEnToKo: 0,
    incorrectCountEnToKo: 0,
    lastStudiedAt: now,
  }
}

function createDaySession(contentId: LearningContentId): DaySessionSummary {
  return {
    contentId,
    completedStudy: false,
    koToEnHighScore: 0,
    enToKoHighScore: 0,
  }
}

export async function toggleMastered(
  contentId: LearningContentId,
  wordId: string,
  database: VocaDatabase = db,
): Promise<boolean> {
  requireContentId(contentId)
  requireWordId(wordId)
  const id = progressRecordId(contentId, wordId)

  return database.transaction('rw', database.progress, async () => {
    const now = new Date().toISOString()
    const current = (await database.progress.get(id)) ?? createProgress(contentId, wordId, now)
    const isMastered = !current.isMastered

    await database.progress.put({
      ...current,
      wordId,
      isMastered,
      lastStudiedAt: now,
    })

    return isMastered
  })
}

export async function toggleFavorite(
  contentId: LearningContentId,
  wordId: string,
  database: VocaDatabase = db,
): Promise<boolean> {
  requireContentId(contentId)
  requireWordId(wordId)
  return database.transaction('rw', database.progress, async () => {
    const now = new Date().toISOString()
    const id = progressRecordId(contentId, wordId)
    const current = (await database.progress.get(id)) ?? createProgress(contentId, wordId, now)
    const isFavorite = !current.isFavorite
    await database.progress.put({ ...current, isFavorite, lastStudiedAt: now })
    return isFavorite
  })
}

export async function recordQuizResult(
  contentId: LearningContentId,
  wordId: string,
  mode: QuizMode,
  isCorrect: boolean,
  database: VocaDatabase = db,
): Promise<void> {
  requireContentId(contentId)
  requireWordId(wordId)
  requireQuizMode(mode)
  if (typeof isCorrect !== 'boolean') {
    throw new TypeError('isCorrect must be a boolean.')
  }

  await database.transaction('rw', database.progress, async () => {
    const now = new Date().toISOString()
    const id = progressRecordId(contentId, wordId)
    const current = (await database.progress.get(id)) ?? createProgress(contentId, wordId, now)
    const result = isCorrect ? 'correct' : 'incorrect'

    if (mode === 'ko-to-en') {
      await database.progress.put({
        ...current,
        correctCountKoToEn: current.correctCountKoToEn + (isCorrect ? 1 : 0),
        incorrectCountKoToEn: current.incorrectCountKoToEn + (isCorrect ? 0 : 1),
        lastResultKoToEn: result,
        lastStudiedAt: now,
      })
      return
    }

    await database.progress.put({
      ...current,
      correctCountEnToKo: current.correctCountEnToKo + (isCorrect ? 1 : 0),
      incorrectCountEnToKo: current.incorrectCountEnToKo + (isCorrect ? 0 : 1),
      lastResultEnToKo: result,
      lastStudiedAt: now,
    })
  })
}

export async function markStudyCompleted(
  contentId: LearningContentId,
  database: VocaDatabase = db,
): Promise<void> {
  requireContentId(contentId)

  await database.transaction('rw', database.daySessions, async () => {
    const current = (await database.daySessions.get(contentId)) ?? createDaySession(contentId)
    if (!current.completedStudy) {
      await database.daySessions.put({ ...current, completedStudy: true })
    }
  })
}

export async function updateQuizHighScore(
  contentId: LearningContentId,
  mode: QuizMode,
  score: number,
  database: VocaDatabase = db,
): Promise<boolean> {
  requireContentId(contentId)
  requireQuizMode(mode)
  requireScore(score)

  return database.transaction('rw', database.daySessions, async () => {
    const current = (await database.daySessions.get(contentId)) ?? createDaySession(contentId)
    const now = new Date().toISOString()

    if (mode === 'ko-to-en') {
      const isNewHighScore = score > current.koToEnHighScore
      await database.daySessions.put({
        ...current,
        koToEnHighScore: isNewHighScore ? score : current.koToEnHighScore,
        lastAttemptAtKoToEn: now,
      })
      return isNewHighScore
    }

    const isNewHighScore = score > current.enToKoHighScore
    await database.daySessions.put({
      ...current,
      enToKoHighScore: isNewHighScore ? score : current.enToKoHighScore,
      lastAttemptAtEnToKo: now,
    })
    return isNewHighScore
  })
}

export async function getProgressForWords(
  contentId: LearningContentId,
  wordIds: readonly string[],
  database: VocaDatabase = db,
): Promise<Map<string, UserProgressRecord>> {
  requireContentId(contentId)
  wordIds.forEach(requireWordId)
  const records = await database.progress.bulkGet(wordIds.map((wordId) => progressRecordId(contentId, wordId)))
  const result = new Map<string, UserProgressRecord>()

  records.forEach((record) => {
    if (record !== undefined) {
      result.set(record.wordId, record)
    }
  })

  return result
}

export async function getIncorrectProgress(
  contentId: LearningContentId,
  filter: IncorrectProgressFilter,
  database: VocaDatabase = db,
): Promise<UserProgressRecord[]> {
  requireContentId(contentId)
  const contentRecords = () => database.progress.where('contentId').equals(contentId)
  if (filter === 'ko-to-en') return contentRecords().filter((record) => record.lastResultKoToEn === 'incorrect').toArray()
  if (filter === 'en-to-ko') return contentRecords().filter((record) => record.lastResultEnToKo === 'incorrect').toArray()
  if (filter !== 'all') {
    throw new TypeError(`Unsupported incorrect-progress filter: ${String(filter)}.`)
  }

  return contentRecords()
    .filter(
      (record) =>
        record.lastResultKoToEn === 'incorrect' || record.lastResultEnToKo === 'incorrect',
    )
    .toArray()
}

export async function deleteDatabase(database: VocaDatabase): Promise<void> {
  database.close()
  await Dexie.delete(database.name)
}
