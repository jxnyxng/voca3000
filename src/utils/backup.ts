import { APP_VERSION } from '../constants/app'
import { db, type VocaDatabase } from '../db'
import type { VocaBackupPayload } from '../types/backup'
import type { DaySessionSummary, QuizResult, UserProgressRecord } from '../types/progress'

export type BackupErrorCode =
  | 'JSON_PARSE_ERROR'
  | 'UNSUPPORTED_SCHEMA_VERSION'
  | 'BACKUP_VALIDATION_ERROR'
  | 'DATABASE_WRITE_ERROR'

const PARSE_MESSAGE = '백업 파일을 읽을 수 없어요. 올바른 JSON 파일인지 확인해 주세요.'
const VERSION_MESSAGE = '지원하지 않는 백업 버전이에요. 최신 형식의 백업 파일을 선택해 주세요.'
const VALIDATION_MESSAGE = '백업 데이터가 올바르지 않아 복원할 수 없어요.'
const WRITE_MESSAGE = '백업을 저장하지 못했어요. 기존 데이터는 그대로 유지됩니다.'

export class BackupError extends Error {
  readonly code: BackupErrorCode
  readonly userMessage: string

  constructor(
    code: BackupErrorCode,
    userMessage: string,
    detail: string,
    options?: ErrorOptions,
  ) {
    super(detail, options)
    this.name = 'BackupError'
    this.code = code
    this.userMessage = userMessage
  }
}

function fail(path: string, detail: string): never {
  throw new BackupError(
    'BACKUP_VALIDATION_ERROR',
    VALIDATION_MESSAGE,
    `${path}: ${detail}`,
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readRecord(value: unknown, path: string): Record<string, unknown> {
  if (!isRecord(value)) {
    fail(path, '객체여야 합니다.')
  }
  return value
}

function readString(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    fail(path, '비어 있지 않은 문자열이어야 합니다.')
  }
  return value
}

function readBoolean(value: unknown, path: string): boolean {
  if (typeof value !== 'boolean') {
    fail(path, 'boolean이어야 합니다.')
  }
  return value
}

function readNonNegativeInteger(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    fail(path, '0 이상의 정수여야 합니다.')
  }
  return value
}

function readDay(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 100) {
    fail(path, '1부터 100 사이의 정수여야 합니다.')
  }
  return value
}

function readScore(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 100) {
    fail(path, '0부터 100 사이의 정수여야 합니다.')
  }
  return value
}

function readDate(value: unknown, path: string): string {
  const date = readString(value, path)
  if (Number.isNaN(Date.parse(date))) {
    fail(path, '유효한 날짜 문자열이어야 합니다.')
  }
  return date
}

function readOptionalDate(value: unknown, path: string): string | undefined {
  return value === undefined ? undefined : readDate(value, path)
}

function readOptionalResult(value: unknown, path: string): QuizResult | undefined {
  if (value === undefined) {
    return undefined
  }
  if (value !== 'correct' && value !== 'incorrect') {
    fail(path, 'correct 또는 incorrect여야 합니다.')
  }
  return value
}

function readProgress(
  value: unknown,
  index: number,
  knownWordIds: ReadonlySet<string>,
): UserProgressRecord {
  const path = `data.progress[${index}]`
  const record = readRecord(value, path)
  const wordId = readString(record.wordId, `${path}.wordId`)

  if (!knownWordIds.has(wordId)) {
    fail(`${path}.wordId`, `배포된 단어 데이터에 없는 ID입니다: ${wordId}`)
  }

  return {
    wordId,
    isMastered: readBoolean(record.isMastered, `${path}.isMastered`),
    correctCountKoToEn: readNonNegativeInteger(
      record.correctCountKoToEn,
      `${path}.correctCountKoToEn`,
    ),
    incorrectCountKoToEn: readNonNegativeInteger(
      record.incorrectCountKoToEn,
      `${path}.incorrectCountKoToEn`,
    ),
    correctCountEnToKo: readNonNegativeInteger(
      record.correctCountEnToKo,
      `${path}.correctCountEnToKo`,
    ),
    incorrectCountEnToKo: readNonNegativeInteger(
      record.incorrectCountEnToKo,
      `${path}.incorrectCountEnToKo`,
    ),
    lastResultKoToEn: readOptionalResult(record.lastResultKoToEn, `${path}.lastResultKoToEn`),
    lastResultEnToKo: readOptionalResult(record.lastResultEnToKo, `${path}.lastResultEnToKo`),
    lastStudiedAt: readDate(record.lastStudiedAt, `${path}.lastStudiedAt`),
  }
}

function readDaySession(value: unknown, index: number): DaySessionSummary {
  const path = `data.daySessions[${index}]`
  const record = readRecord(value, path)

  return {
    day: readDay(record.day, `${path}.day`),
    completedStudy: readBoolean(record.completedStudy, `${path}.completedStudy`),
    koToEnHighScore: readScore(record.koToEnHighScore, `${path}.koToEnHighScore`),
    enToKoHighScore: readScore(record.enToKoHighScore, `${path}.enToKoHighScore`),
    lastAttemptAtKoToEn: readOptionalDate(
      record.lastAttemptAtKoToEn,
      `${path}.lastAttemptAtKoToEn`,
    ),
    lastAttemptAtEnToKo: readOptionalDate(
      record.lastAttemptAtEnToKo,
      `${path}.lastAttemptAtEnToKo`,
    ),
  }
}

function requireUniqueKeys<T>(
  records: readonly T[],
  getKey: (record: T) => string | number,
  path: string,
): void {
  const keys = new Set<string | number>()
  records.forEach((record, index) => {
    const key = getKey(record)
    if (keys.has(key)) {
      fail(`${path}[${index}]`, `기본키 ${String(key)}가 중복되었습니다.`)
    }
    keys.add(key)
  })
}

export function validateBackupPayload(
  value: unknown,
  knownWordIds: ReadonlySet<string>,
): VocaBackupPayload {
  const root = readRecord(value, 'backup')
  if (root.schemaVersion !== 1) {
    throw new BackupError(
      'UNSUPPORTED_SCHEMA_VERSION',
      VERSION_MESSAGE,
      `Unsupported schemaVersion: ${String(root.schemaVersion)}.`,
    )
  }

  const appVersion = readString(root.appVersion, 'appVersion')
  const exportedAt = readDate(root.exportedAt, 'exportedAt')
  const totalMasteredCount = readNonNegativeInteger(
    root.totalMasteredCount,
    'totalMasteredCount',
  )
  const data = readRecord(root.data, 'data')

  if (!Array.isArray(data.progress)) {
    fail('data.progress', '배열이어야 합니다.')
  }
  if (!Array.isArray(data.daySessions)) {
    fail('data.daySessions', '배열이어야 합니다.')
  }
  if (data.progress.length > 3000) {
    fail('data.progress', '레코드 수는 3,000개를 초과할 수 없습니다.')
  }
  if (data.daySessions.length > 100) {
    fail('data.daySessions', '레코드 수는 100개를 초과할 수 없습니다.')
  }

  const progress = data.progress.map((record, index) =>
    readProgress(record, index, knownWordIds),
  )
  const daySessions = data.daySessions.map(readDaySession)
  requireUniqueKeys(progress, (record) => record.wordId, 'data.progress')
  requireUniqueKeys(daySessions, (record) => record.day, 'data.daySessions')

  const calculatedMasteredCount = progress.filter((record) => record.isMastered).length
  if (calculatedMasteredCount !== totalMasteredCount) {
    fail(
      'totalMasteredCount',
      `progress 기준 값 ${calculatedMasteredCount}와 일치하지 않습니다.`,
    )
  }

  return {
    schemaVersion: 1,
    appVersion,
    exportedAt,
    totalMasteredCount,
    data: { progress, daySessions },
  }
}

export async function exportUserData(database: VocaDatabase = db): Promise<VocaBackupPayload> {
  return database.transaction('r', database.progress, database.daySessions, async () => {
    const progress = (await database.progress.toArray()).sort((a, b) =>
      a.wordId.localeCompare(b.wordId),
    )
    const daySessions = (await database.daySessions.toArray()).sort((a, b) => a.day - b.day)

    return {
      schemaVersion: 1,
      appVersion: APP_VERSION,
      exportedAt: new Date().toISOString(),
      totalMasteredCount: progress.filter((record) => record.isMastered).length,
      data: { progress, daySessions },
    }
  })
}

export async function exportUserDataJson(database: VocaDatabase = db): Promise<string> {
  return JSON.stringify(await exportUserData(database), null, 2)
}

export function parseBackupJson(
  jsonString: string,
  knownWordIds: ReadonlySet<string>,
): VocaBackupPayload {
  let parsed: unknown

  try {
    parsed = JSON.parse(jsonString)
  } catch (error) {
    throw new BackupError(
      'JSON_PARSE_ERROR',
      PARSE_MESSAGE,
      'Backup file is not valid JSON.',
      { cause: error },
    )
  }

  return validateBackupPayload(parsed, knownWordIds)
}

export async function restoreUserData(
  jsonString: string,
  knownWordIds: ReadonlySet<string>,
  database: VocaDatabase = db,
): Promise<void> {
  const payload = parseBackupJson(jsonString, knownWordIds)

  try {
    await database.transaction('rw', database.progress, database.daySessions, async () => {
      await database.progress.clear()
      await database.daySessions.clear()
      if (payload.data.progress.length > 0) {
        await database.progress.bulkPut(payload.data.progress)
      }
      if (payload.data.daySessions.length > 0) {
        await database.daySessions.bulkPut(payload.data.daySessions)
      }
    })
  } catch (error) {
    throw new BackupError(
      'DATABASE_WRITE_ERROR',
      WRITE_MESSAGE,
      'Backup restore transaction failed and was rolled back.',
      { cause: error },
    )
  }
}
