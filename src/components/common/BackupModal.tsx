import { Download, Upload, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { VocaDatabase } from '../../db'
import { BackupError, exportUserDataJson, parseBackupJson, restoreUserData } from '../../utils/backup'

interface PendingRestore {
  fileName: string
  json: string
  knownWordIds: ReadonlySet<string>
  progressCount: number
  daySessionCount: number
}

export interface BackupModalProps {
  database: VocaDatabase
  getKnownWordIds: () => Promise<ReadonlySet<string>>
  onClose: () => void
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof BackupError ? error.userMessage : fallback
}

export function BackupModal({ database, getKnownWordIds, onClose }: BackupModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const openerRef = useRef<HTMLElement | null>(null)
  const [pendingRestore, setPendingRestore] = useState<PendingRestore | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [isReading, setIsReading] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    closeButtonRef.current?.focus()
    return () => openerRef.current?.focus()
  }, [])

  const close = (): void => {
    if (!isExporting && !isReading && !isRestoring) onClose()
  }

  const trapFocus = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Escape') {
      event.preventDefault()
      close()
      return
    }
    if (event.key !== 'Tab') return
    const focusable = [...(dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
    ) ?? [])]
    if (focusable.length === 0) return
    const first = focusable[0]!
    const last = focusable[focusable.length - 1]!
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  const downloadBackup = async (): Promise<void> => {
    setIsExporting(true)
    setError(null)
    setMessage(null)
    try {
      const json = await exportUserDataJson(database)
      const url = URL.createObjectURL(new Blob([json], { type: 'application/json;charset=utf-8' }))
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `voca3000-backup-${new Date().toISOString().slice(0, 10)}.json`
      anchor.click()
      URL.revokeObjectURL(url)
      setMessage('백업 파일을 다운로드했어요.')
    } catch {
      setError('백업 파일을 만들지 못했어요. 다시 시도해 주세요.')
    } finally {
      setIsExporting(false)
    }
  }

  const prepareRestore = async (file: File): Promise<void> => {
    setIsReading(true)
    setPendingRestore(null)
    setError(null)
    setMessage(null)
    try {
      const [json, knownWordIds] = await Promise.all([file.text(), getKnownWordIds()])
      const payload = parseBackupJson(json, knownWordIds)
      setPendingRestore({
        fileName: file.name,
        json,
        knownWordIds,
        progressCount: payload.data.progress.length,
        daySessionCount: payload.data.daySessions.length,
      })
    } catch (caught) {
      setError(errorMessage(caught, '백업 파일을 확인하지 못했어요. 다시 선택해 주세요.'))
    } finally {
      setIsReading(false)
    }
  }

  const restore = async (): Promise<void> => {
    if (!pendingRestore) return
    setIsRestoring(true)
    setError(null)
    setMessage(null)
    try {
      await restoreUserData(pendingRestore.json, pendingRestore.knownWordIds, database)
      setPendingRestore(null)
      setMessage('백업 데이터를 복원했어요.')
    } catch (caught) {
      setError(errorMessage(caught, '백업을 복원하지 못했어요. 기존 데이터는 그대로 유지됩니다.'))
    } finally {
      setIsRestoring(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="presentation">
      <div
        ref={dialogRef}
        className="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-toss-card bg-toss-surface p-5 shadow-toss-float sm:p-7"
        role="dialog"
        aria-modal="true"
        aria-labelledby="backup-modal-title"
        onKeyDown={trapFocus}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="backup-modal-title" className="text-xl font-bold text-toss-text">백업 및 복원</h2>
            <p className="mt-1 text-sm leading-6 text-toss-muted">학습 기록은 브라우저 안에서만 처리돼요.</p>
          </div>
          <button ref={closeButtonRef} type="button" className="grid size-11 shrink-0 place-items-center rounded-full hover:bg-toss-bg" aria-label="백업 및 복원 닫기" disabled={isExporting || isReading || isRestoring} onClick={close}>
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <section className="mt-6 rounded-toss-button bg-toss-bg p-4" aria-labelledby="backup-export-title">
          <h3 id="backup-export-title" className="font-bold text-toss-text">내보내기</h3>
          <p className="mt-1 text-sm leading-6 text-toss-muted">현재 진도와 퀴즈 기록을 JSON 파일로 저장해요.</p>
          <button type="button" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-toss-button bg-toss-blue px-4 font-semibold text-white disabled:opacity-50" disabled={isExporting || isReading || isRestoring} onClick={() => { void downloadBackup() }}>
            <Download className="size-4" aria-hidden="true" />
            {isExporting ? '백업 만드는 중' : '백업 다운로드'}
          </button>
        </section>

        <section className="mt-4 rounded-toss-button border border-toss-border p-4" aria-labelledby="backup-restore-title">
          <h3 id="backup-restore-title" className="font-bold text-toss-text">복원</h3>
          <p className="mt-1 text-sm leading-6 text-toss-muted">복원하면 현재 기록 전체가 선택한 백업으로 교체돼요.</p>
          <label className="mt-4 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-toss-button border border-toss-border px-4 font-semibold text-toss-text">
            <Upload className="size-4" aria-hidden="true" />
            {isReading ? '파일 확인 중' : '백업 파일 선택'}
            <input
              type="file"
              className="sr-only"
              accept="application/json,.json"
              disabled={isExporting || isReading || isRestoring}
              onChange={(event) => {
                const file = event.currentTarget.files?.[0]
                if (file) void prepareRestore(file)
                event.currentTarget.value = ''
              }}
            />
          </label>

          {pendingRestore ? (
            <div className="mt-4 rounded-toss-button bg-toss-error/5 p-4">
              <p className="font-semibold text-toss-text">{pendingRestore.fileName}</p>
              <p className="mt-1 text-sm text-toss-muted">단어 기록 {pendingRestore.progressCount}개 · Day 기록 {pendingRestore.daySessionCount}개</p>
              <p className="mt-3 text-sm font-semibold text-toss-error">현재 학습 기록을 모두 덮어씁니다.</p>
              <button type="button" className="mt-3 min-h-11 rounded-toss-button bg-toss-error px-4 font-semibold text-white disabled:opacity-50" disabled={isRestoring} onClick={() => { void restore() }}>
                {isRestoring ? '복원 중' : '이 백업으로 덮어쓰기'}
              </button>
            </div>
          ) : null}
        </section>

        {message ? <p className="mt-4 text-sm font-semibold text-toss-success" role="status">{message}</p> : null}
        {error ? <p className="mt-4 text-sm text-toss-error" role="alert">{error}</p> : null}
      </div>
    </div>
  )
}
