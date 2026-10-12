import { CheckCircle2, DatabaseBackup } from 'lucide-react'
import { ProgressBar } from './ProgressBar'

export interface HeaderProps {
  day: number
  category: string
  completedStudy: boolean
  masteredCount: number
  totalCount: number
  onBackup?: () => void
}

export function Header({ day, category, completedStudy, masteredCount, totalCount, onBackup }: HeaderProps) {
  return (
    <header className="border-b border-toss-border bg-toss-surface">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <a href="./" className="inline-block text-xl font-extrabold tracking-tight text-toss-text no-underline" aria-label="voca3000 홈">
              voca<span className="text-toss-blue">3000</span>
            </a>
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <strong className="text-toss-text">Day {String(day).padStart(2, '0')}</strong>
              <span aria-hidden="true" className="text-toss-border">·</span>
              <span className="text-toss-muted">{category}</span>
              <span className={completedStudy ? 'inline-flex items-center gap-1 font-medium text-toss-success' : 'text-toss-muted'}>
                {completedStudy ? <CheckCircle2 className="size-4" aria-hidden="true" /> : null}
                {completedStudy ? '학습 완료' : '학습 전'}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-toss-button border border-toss-border bg-toss-surface px-3 font-semibold text-toss-text transition-colors hover:bg-toss-bg disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none sm:px-4"
            onClick={onBackup}
            disabled={onBackup === undefined}
            aria-label="학습 데이터 백업 및 복원"
            title={onBackup === undefined ? '백업 기능 준비 중' : undefined}
          >
            <DatabaseBackup className="size-5" aria-hidden="true" />
            <span className="hidden sm:inline">백업·복원</span>
          </button>
        </div>
        <ProgressBar value={masteredCount} max={totalCount} label="외운 단어" />
      </div>
    </header>
  )
}
