import type { DaySessionSummary, UserProgressRecord } from './progress'

export interface VocaBackupPayload {
  schemaVersion: 1
  appVersion: string
  exportedAt: string
  totalMasteredCount: number
  data: {
    progress: UserProgressRecord[]
    daySessions: DaySessionSummary[]
  }
}
