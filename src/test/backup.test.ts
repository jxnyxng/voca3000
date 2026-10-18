import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { APP_VERSION } from '../constants/app'
import { deleteDatabase, VocaDatabase } from '../db'
import type { VocaBackupPayload } from '../types/backup'
import { builtinContentId, progressRecordId } from '../types/content'
import type { DaySessionSummary, UserProgressRecord } from '../types/progress'
import {
  BackupError,
  exportUserData,
  exportUserDataJson,
  restoreUserData,
  validateBackupPayload,
} from '../utils/backup'

const knownWordIds = new Set(['w0001', 'w0002', 'w0003'])
const now = '2026-10-12T00:00:00.000Z'
const CONTENT_ID = builtinContentId('en', 1)

function createProgress(overrides: Partial<UserProgressRecord> = {}): UserProgressRecord {
  const contentId = overrides.contentId ?? CONTENT_ID
  const wordId = overrides.wordId ?? 'w0001'
  return {
    progressId: overrides.progressId ?? progressRecordId(contentId, wordId),
    contentId,
    wordId,
    isMastered: true,
    correctCountKoToEn: 1,
    incorrectCountKoToEn: 0,
    correctCountEnToKo: 0,
    incorrectCountEnToKo: 1,
    lastResultKoToEn: 'correct',
    lastResultEnToKo: 'incorrect',
    lastStudiedAt: now,
    ...overrides,
  }
}

function createSession(overrides: Partial<DaySessionSummary> = {}): DaySessionSummary {
  return {
    contentId: CONTENT_ID,
    completedStudy: true,
    koToEnHighScore: 90,
    enToKoHighScore: 80,
    lastAttemptAtKoToEn: now,
    lastAttemptAtEnToKo: now,
    ...overrides,
  }
}

function createPayload(overrides: Partial<VocaBackupPayload> = {}): VocaBackupPayload {
  return {
    schemaVersion: 2,
    appVersion: APP_VERSION,
    exportedAt: now,
    totalMasteredCount: 1,
    data: {
      progress: [createProgress()],
      daySessions: [createSession()],
    },
    ...overrides,
  }
}

async function expectBackupError(
  promise: Promise<unknown>,
  code: string,
): Promise<BackupError> {
  try {
    await promise
  } catch (error) {
    expect(error).toBeInstanceOf(BackupError)
    if (error instanceof BackupError) {
      expect(error.code).toBe(code)
      return error
    }
  }
  throw new Error(`Expected ${code} backup error`)
}

let database: VocaDatabase
let databaseNumber = 0

beforeEach(() => {
  databaseNumber += 1
  database = new VocaDatabase(`Voca3000BackupTestDB-${databaseNumber}`)
})

afterEach(async () => {
  vi.restoreAllMocks()
  await deleteDatabase(database)
})

describe('backup export', () => {
  it('exports a deterministic snapshot with calculated metadata', async () => {
    await database.progress.bulkPut([
      createProgress({ wordId: 'w0002', isMastered: false }),
      createProgress({ wordId: 'w0001', isMastered: true }),
    ])
    await database.daySessions.bulkPut([
      createSession({ contentId: builtinContentId('en', 2) }),
      createSession(),
    ])

    const payload = await exportUserData(database)
    const json = await exportUserDataJson(database)

    expect(payload.schemaVersion).toBe(2)
    expect(payload.appVersion).toBe(APP_VERSION)
    expect(payload.totalMasteredCount).toBe(1)
    expect(payload.data.progress.map(({ wordId }) => wordId)).toEqual(['w0001', 'w0002'])
    expect(payload.data.daySessions.map(({ contentId }) => contentId)).toEqual([
      CONTENT_ID,
      builtinContentId('en', 2),
    ])
    expect(JSON.parse(json).data.progress).toHaveLength(2)
    expect(json).toContain('\n  "schemaVersion"')
  })
})

describe('backup validation', () => {
  it('accepts a valid payload and rebuilds typed records', () => {
    expect(validateBackupPayload(createPayload(), knownWordIds)).toEqual(createPayload())
  })

  it('rejects unsupported schema versions separately', async () => {
    const payload = { ...createPayload(), schemaVersion: 1 }
    const error = await expectBackupError(
      restoreUserData(JSON.stringify(payload), knownWordIds, database),
      'UNSUPPORTED_SCHEMA_VERSION',
    )
    expect(error.userMessage).toContain('버전')
  })

  it('rejects invalid types, ranges, enums, and dates', () => {
    expect(() =>
      validateBackupPayload(
        { ...createPayload(), exportedAt: 'not-a-date' },
        knownWordIds,
      ),
    ).toThrow(BackupError)

    const invalidProgress = createProgress({ correctCountKoToEn: -1 })
    expect(() =>
      validateBackupPayload(
        { ...createPayload(), data: { progress: [invalidProgress], daySessions: [] } },
        knownWordIds,
      ),
    ).toThrow(BackupError)

    const invalidSession = createSession({ koToEnHighScore: 101 })
    expect(() =>
      validateBackupPayload(
        { ...createPayload(), data: { progress: [createProgress()], daySessions: [invalidSession] } },
        knownWordIds,
      ),
    ).toThrow(BackupError)

    const invalidResult = { ...createProgress(), lastResultKoToEn: 'maybe' }
    expect(() =>
      validateBackupPayload(
        { ...createPayload(), data: { progress: [invalidResult], daySessions: [] } },
        knownWordIds,
      ),
    ).toThrow(BackupError)
  })

  it('rejects duplicate primary keys and unknown word IDs', () => {
    expect(() =>
      validateBackupPayload(
        {
          ...createPayload(),
          totalMasteredCount: 2,
          data: { progress: [createProgress(), createProgress()], daySessions: [] },
        },
        knownWordIds,
      ),
    ).toThrow(/중복/)

    expect(() =>
      validateBackupPayload(
        {
          ...createPayload(),
          data: { progress: [createProgress({ wordId: 'w9999' })], daySessions: [] },
        },
        knownWordIds,
      ),
    ).toThrow(/없는 ID/)

    expect(() =>
      validateBackupPayload(
        {
          ...createPayload(),
          data: { progress: [createProgress()], daySessions: [createSession(), createSession()] },
        },
        knownWordIds,
      ),
    ).toThrow(/중복/)
  })

  it('rejects record limits and inconsistent mastered metadata', () => {
    const tooManyProgress = Array.from({ length: 3001 }, () => createProgress())
    expect(() =>
      validateBackupPayload(
        {
          ...createPayload(),
          totalMasteredCount: 3001,
          data: { progress: tooManyProgress, daySessions: [] },
        },
        knownWordIds,
      ),
    ).toThrow(/3,000/)

    expect(() =>
      validateBackupPayload(
        { ...createPayload(), totalMasteredCount: 0 },
        knownWordIds,
      ),
    ).toThrow(/일치하지 않습니다/)
  })
})

describe('backup restore', () => {
  it('distinguishes malformed JSON from structural validation errors', async () => {
    await expectBackupError(
      restoreUserData('{not-json', knownWordIds, database),
      'JSON_PARSE_ERROR',
    )
    await expectBackupError(
      restoreUserData(JSON.stringify({ schemaVersion: 2 }), knownWordIds, database),
      'BACKUP_VALIDATION_ERROR',
    )
  })

  it('replaces both tables only after validation succeeds', async () => {
    await database.progress.put(createProgress({ wordId: 'w0003', isMastered: false }))
    await database.daySessions.put(createSession({ contentId: builtinContentId('en', 3) }))

    await restoreUserData(JSON.stringify(createPayload()), knownWordIds, database)

    expect(await database.progress.toArray()).toEqual([createProgress()])
    expect(await database.daySessions.toArray()).toEqual([createSession()])
  })

  it('does not alter existing data when validation fails', async () => {
    const existingProgress = createProgress({ wordId: 'w0002', isMastered: false })
    await database.progress.put(existingProgress)

    await expectBackupError(
      restoreUserData(
        JSON.stringify({ ...createPayload(), totalMasteredCount: 0 }),
        knownWordIds,
        database,
      ),
      'BACKUP_VALIDATION_ERROR',
    )

    expect(await database.progress.toArray()).toEqual([existingProgress])
  })

  it('rolls back both tables when a bulk write fails', async () => {
    const existingProgress = createProgress({ wordId: 'w0002', isMastered: false })
    const existingSession = createSession({ contentId: builtinContentId('en', 2) })
    await database.progress.put(existingProgress)
    await database.daySessions.put(existingSession)
    vi.spyOn(database.daySessions, 'bulkPut').mockRejectedValueOnce(new Error('write failed'))

    const error = await expectBackupError(
      restoreUserData(JSON.stringify(createPayload()), knownWordIds, database),
      'DATABASE_WRITE_ERROR',
    )

    expect(error.userMessage).toContain('기존 데이터는 그대로')
    expect(await database.progress.toArray()).toEqual([existingProgress])
    expect(await database.daySessions.toArray()).toEqual([existingSession])
  })
})
