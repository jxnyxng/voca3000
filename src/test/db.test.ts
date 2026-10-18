import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  deleteDatabase,
  getIncorrectProgress,
  getProgressForWords,
  markStudyCompleted,
  recordQuizResult,
  toggleMastered,
  updateQuizHighScore,
  VocaDatabase,
} from '../db'
import { builtinContentId, progressRecordId } from '../types/content'

const CONTENT_ID = builtinContentId('en', 1)
const JAPANESE_CONTENT_ID = builtinContentId('ja', 1)

let database: VocaDatabase
let databaseNumber = 0

beforeEach(() => {
  databaseNumber += 1
  database = new VocaDatabase(`Voca3000TestDB-${databaseNumber}`)
})

afterEach(async () => {
  await deleteDatabase(database)
})

describe('progress database', () => {
  it('creates a progress record on the first mastered toggle and toggles repeatedly', async () => {
    await expect(toggleMastered(CONTENT_ID, 'w0001', database)).resolves.toBe(true)
    await expect(toggleMastered(CONTENT_ID, 'w0001', database)).resolves.toBe(false)

    const record = await database.progress.get(progressRecordId(CONTENT_ID, 'w0001'))
    expect(record).toMatchObject({
      wordId: 'w0001',
      isMastered: false,
      correctCountKoToEn: 0,
      incorrectCountKoToEn: 0,
      correctCountEnToKo: 0,
      incorrectCountEnToKo: 0,
    })
    expect(new Date(record?.lastStudiedAt ?? '').toISOString()).toBe(record?.lastStudiedAt)
  })

  it('records counts and the latest result independently for each quiz mode', async () => {
    await recordQuizResult(CONTENT_ID, 'w0001', 'ko-to-en', false, database)
    await recordQuizResult(CONTENT_ID, 'w0001', 'ko-to-en', true, database)
    await recordQuizResult(CONTENT_ID, 'w0001', 'en-to-ko', false, database)

    expect(await database.progress.get(progressRecordId(CONTENT_ID, 'w0001'))).toMatchObject({
      correctCountKoToEn: 1,
      incorrectCountKoToEn: 1,
      correctCountEnToKo: 0,
      incorrectCountEnToKo: 1,
      lastResultKoToEn: 'correct',
      lastResultEnToKo: 'incorrect',
      isMastered: false,
    })
  })

  it('does not lose fast concurrent quiz updates', async () => {
    await Promise.all(
      Array.from({ length: 20 }, (_, index) =>
        recordQuizResult(CONTENT_ID, 'w0001', 'ko-to-en', index % 2 === 0, database),
      ),
    )

    const record = await database.progress.get(progressRecordId(CONTENT_ID, 'w0001'))
    expect(record?.correctCountKoToEn).toBe(10)
    expect(record?.incorrectCountKoToEn).toBe(10)
  })

  it('marks study completion without resetting scores', async () => {
    await updateQuizHighScore(CONTENT_ID, 'ko-to-en', 80, database)
    await markStudyCompleted(CONTENT_ID, database)
    await markStudyCompleted(CONTENT_ID, database)

    expect(await database.daySessions.get(CONTENT_ID)).toMatchObject({
      completedStudy: true,
      koToEnHighScore: 80,
      enToKoHighScore: 0,
    })
  })

  it('updates only higher scores per mode and records every completed attempt time', async () => {
    await expect(updateQuizHighScore(CONTENT_ID, 'ko-to-en', 70, database)).resolves.toBe(true)
    const firstAttempt = await database.daySessions.get(CONTENT_ID)
    await expect(updateQuizHighScore(CONTENT_ID, 'ko-to-en', 60, database)).resolves.toBe(false)
    await expect(updateQuizHighScore(CONTENT_ID, 'en-to-ko', 85, database)).resolves.toBe(true)

    const session = await database.daySessions.get(CONTENT_ID)
    expect(session).toMatchObject({
      koToEnHighScore: 70,
      enToKoHighScore: 85,
    })
    expect(session?.lastAttemptAtKoToEn).toBeDefined()
    expect(session?.lastAttemptAtEnToKo).toBeDefined()
    expect(firstAttempt?.lastAttemptAtKoToEn).toBeDefined()
  })

  it('returns progress for requested words and filters recent incorrect results', async () => {
    await recordQuizResult(CONTENT_ID, 'w0001', 'ko-to-en', false, database)
    await recordQuizResult(CONTENT_ID, 'w0002', 'en-to-ko', false, database)
    await recordQuizResult(CONTENT_ID, 'w0003', 'ko-to-en', false, database)
    await recordQuizResult(CONTENT_ID, 'w0003', 'ko-to-en', true, database)

    const progress = await getProgressForWords(CONTENT_ID, ['w0002', 'w0001', 'w9999'], database)
    expect([...progress.keys()]).toEqual(['w0002', 'w0001'])
    expect((await getIncorrectProgress(CONTENT_ID, 'ko-to-en', database)).map(({ wordId }) => wordId)).toEqual([
      'w0001',
    ])
    expect((await getIncorrectProgress(CONTENT_ID, 'en-to-ko', database)).map(({ wordId }) => wordId)).toEqual([
      'w0002',
    ])
    expect(
      (await getIncorrectProgress(CONTENT_ID, 'all', database)).map(({ wordId }) => wordId).sort(),
    ).toEqual(['w0001', 'w0002'])
  })

  it('rejects invalid word IDs, modes, days, scores, and filters', async () => {
    await expect(toggleMastered(CONTENT_ID, '  ', database)).rejects.toThrow(TypeError)
    await expect(
      Reflect.apply(recordQuizResult, undefined, [CONTENT_ID, 'w0001', 'unknown-mode', true, database]),
    ).rejects.toThrow(TypeError)
    await expect(markStudyCompleted(' ', database)).rejects.toThrow(TypeError)
    await expect(updateQuizHighScore(' ', 'ko-to-en', 50, database)).rejects.toThrow(TypeError)
    await expect(updateQuizHighScore(CONTENT_ID, 'ko-to-en', 50.5, database)).rejects.toThrow(RangeError)
    await expect(updateQuizHighScore(CONTENT_ID, 'ko-to-en', Number.NaN, database)).rejects.toThrow(
      RangeError,
    )
    await expect(
      Reflect.apply(getIncorrectProgress, undefined, [CONTENT_ID, 'unknown-filter', database]),
    ).rejects.toThrow(TypeError)
  })

  it('isolates identical item IDs and sessions by content', async () => {
    await toggleMastered(CONTENT_ID, 'shared-item', database)
    await recordQuizResult(JAPANESE_CONTENT_ID, 'shared-item', 'ko-to-en', false, database)
    await markStudyCompleted(CONTENT_ID, database)
    await updateQuizHighScore(JAPANESE_CONTENT_ID, 'ko-to-en', 90, database)

    expect(await database.progress.count()).toBe(2)
    expect((await database.progress.get(progressRecordId(CONTENT_ID, 'shared-item')))?.isMastered).toBe(true)
    expect((await database.progress.get(progressRecordId(JAPANESE_CONTENT_ID, 'shared-item')))?.incorrectCountKoToEn).toBe(1)
    expect((await database.daySessions.get(CONTENT_ID))?.completedStudy).toBe(true)
    expect((await database.daySessions.get(JAPANESE_CONTENT_ID))?.koToEnHighScore).toBe(90)
  })
})
