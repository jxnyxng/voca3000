import Dexie, { type Table } from 'dexie'
import type {
  DaySessionSummary,
  IncorrectProgressFilter,
  UserProgressRecord,
} from '../types/progress'
import type { QuizMode } from '../types/word'

const DATABASE_NAME = 'Voca3000DB'

export class VocaDatabase extends Dexie {
  progress!: Table<UserProgressRecord, string>
  daySessions!: Table<DaySessionSummary, number>

  constructor(name = DATABASE_NAME) {
    super(name)
    this.version(1).stores({
      progress: 'wordId, isMastered, lastResultKoToEn, lastResultEnToKo, lastStudiedAt',
      daySessions: 'day, completedStudy, koToEnHighScore, enToKoHighScore',
    })
  }
}

export const db = new VocaDatabase()
export const japaneseDb = new VocaDatabase('Voca3000JapaneseDB')

function requireWordId(wordId: string): void {
  if (typeof wordId !== 'string' || wordId.trim() === '') {
    throw new TypeError('wordId must be a non-empty string.')
  }
}

function requireDay(day: number): void {
  if (!Number.isInteger(day) || day < 1 || day > 100) {
    throw new RangeError('day must be an integer from 1 to 100.')
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

function createProgress(wordId: string, now: string): UserProgressRecord {
  return {
    wordId,
    isMastered: false,
    correctCountKoToEn: 0,
    incorrectCountKoToEn: 0,
    correctCountEnToKo: 0,
    incorrectCountEnToKo: 0,
    lastStudiedAt: now,
  }
}

function createDaySession(day: number): DaySessionSummary {
  return {
    day,
    completedStudy: false,
    koToEnHighScore: 0,
    enToKoHighScore: 0,
  }
}

export async function toggleMastered(
  wordId: string,
  database: VocaDatabase = db,
): Promise<boolean> {
  requireWordId(wordId)

  return database.transaction('rw', database.progress, async () => {
    const now = new Date().toISOString()
    const current = (await database.progress.get(wordId)) ?? createProgress(wordId, now)
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

export async function recordQuizResult(
  wordId: string,
  mode: QuizMode,
  isCorrect: boolean,
  database: VocaDatabase = db,
): Promise<void> {
  requireWordId(wordId)
  requireQuizMode(mode)
  if (typeof isCorrect !== 'boolean') {
    throw new TypeError('isCorrect must be a boolean.')
  }

  await database.transaction('rw', database.progress, async () => {
    const now = new Date().toISOString()
    const current = (await database.progress.get(wordId)) ?? createProgress(wordId, now)
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
  day: number,
  database: VocaDatabase = db,
): Promise<void> {
  requireDay(day)

  await database.transaction('rw', database.daySessions, async () => {
    const current = (await database.daySessions.get(day)) ?? createDaySession(day)
    if (!current.completedStudy) {
      await database.daySessions.put({ ...current, completedStudy: true })
    }
  })
}

export async function updateQuizHighScore(
  day: number,
  mode: QuizMode,
  score: number,
  database: VocaDatabase = db,
): Promise<boolean> {
  requireDay(day)
  requireQuizMode(mode)
  requireScore(score)

  return database.transaction('rw', database.daySessions, async () => {
    const current = (await database.daySessions.get(day)) ?? createDaySession(day)
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
  wordIds: readonly string[],
  database: VocaDatabase = db,
): Promise<Map<string, UserProgressRecord>> {
  wordIds.forEach(requireWordId)
  const records = await database.progress.bulkGet([...wordIds])
  const result = new Map<string, UserProgressRecord>()

  records.forEach((record) => {
    if (record !== undefined) {
      result.set(record.wordId, record)
    }
  })

  return result
}

export async function getIncorrectProgress(
  filter: IncorrectProgressFilter,
  database: VocaDatabase = db,
): Promise<UserProgressRecord[]> {
  if (filter === 'ko-to-en') {
    return database.progress.where('lastResultKoToEn').equals('incorrect').toArray()
  }
  if (filter === 'en-to-ko') {
    return database.progress.where('lastResultEnToKo').equals('incorrect').toArray()
  }
  if (filter !== 'all') {
    throw new TypeError(`Unsupported incorrect-progress filter: ${String(filter)}.`)
  }

  return database.progress
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
