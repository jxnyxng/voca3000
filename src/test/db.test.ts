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
    await expect(toggleMastered('w0001', database)).resolves.toBe(true)
    await expect(toggleMastered('w0001', database)).resolves.toBe(false)

    const record = await database.progress.get('w0001')
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
    await recordQuizResult('w0001', 'ko-to-en', false, database)
    await recordQuizResult('w0001', 'ko-to-en', true, database)
    await recordQuizResult('w0001', 'en-to-ko', false, database)

    expect(await database.progress.get('w0001')).toMatchObject({
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
        recordQuizResult('w0001', 'ko-to-en', index % 2 === 0, database),
      ),
    )

    const record = await database.progress.get('w0001')
    expect(record?.correctCountKoToEn).toBe(10)
    expect(record?.incorrectCountKoToEn).toBe(10)
  })

  it('marks study completion without resetting scores', async () => {
    await updateQuizHighScore(1, 'ko-to-en', 80, database)
    await markStudyCompleted(1, database)
    await markStudyCompleted(1, database)

    expect(await database.daySessions.get(1)).toMatchObject({
      completedStudy: true,
      koToEnHighScore: 80,
      enToKoHighScore: 0,
    })
  })

  it('updates only higher scores per mode and records every completed attempt time', async () => {
    await expect(updateQuizHighScore(1, 'ko-to-en', 70, database)).resolves.toBe(true)
    const firstAttempt = await database.daySessions.get(1)
    await expect(updateQuizHighScore(1, 'ko-to-en', 60, database)).resolves.toBe(false)
    await expect(updateQuizHighScore(1, 'en-to-ko', 85, database)).resolves.toBe(true)

    const session = await database.daySessions.get(1)
    expect(session).toMatchObject({
      koToEnHighScore: 70,
      enToKoHighScore: 85,
    })
    expect(session?.lastAttemptAtKoToEn).toBeDefined()
    expect(session?.lastAttemptAtEnToKo).toBeDefined()
    expect(firstAttempt?.lastAttemptAtKoToEn).toBeDefined()
  })

  it('returns progress for requested words and filters recent incorrect results', async () => {
    await recordQuizResult('w0001', 'ko-to-en', false, database)
    await recordQuizResult('w0002', 'en-to-ko', false, database)
    await recordQuizResult('w0003', 'ko-to-en', false, database)
    await recordQuizResult('w0003', 'ko-to-en', true, database)

    const progress = await getProgressForWords(['w0002', 'w0001', 'w9999'], database)
    expect([...progress.keys()]).toEqual(['w0002', 'w0001'])
    expect((await getIncorrectProgress('ko-to-en', database)).map(({ wordId }) => wordId)).toEqual([
      'w0001',
    ])
    expect((await getIncorrectProgress('en-to-ko', database)).map(({ wordId }) => wordId)).toEqual([
      'w0002',
    ])
    expect(
      (await getIncorrectProgress('all', database)).map(({ wordId }) => wordId).sort(),
    ).toEqual(['w0001', 'w0002'])
  })

  it('rejects invalid word IDs, modes, days, scores, and filters', async () => {
    await expect(toggleMastered('  ', database)).rejects.toThrow(TypeError)
    await expect(
      Reflect.apply(recordQuizResult, undefined, ['w0001', 'unknown-mode', true, database]),
    ).rejects.toThrow(TypeError)
    await expect(markStudyCompleted(0, database)).rejects.toThrow(RangeError)
    await expect(updateQuizHighScore(101, 'ko-to-en', 50, database)).rejects.toThrow(RangeError)
    await expect(updateQuizHighScore(1, 'ko-to-en', 50.5, database)).rejects.toThrow(RangeError)
    await expect(updateQuizHighScore(1, 'ko-to-en', Number.NaN, database)).rejects.toThrow(
      RangeError,
    )
    await expect(
      Reflect.apply(getIncorrectProgress, undefined, ['unknown-filter', database]),
    ).rejects.toThrow(TypeError)
  })
})
