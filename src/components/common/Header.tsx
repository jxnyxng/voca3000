import { CheckCircle2, DatabaseBackup, House } from 'lucide-react'
import { ProgressBar } from './ProgressBar'
import type { StudyLanguage } from '../../types/word'

export interface HeaderProps {
  day: number
  category: string
  completedStudy: boolean
  masteredCount: number
  totalCount: number
  onBackup?: () => void
  onHome?: () => void
  language?: StudyLanguage
}

export function Header({ day, category, completedStudy, masteredCount, totalCount, onBackup, onHome, language = 'en' }: HeaderProps) {
  return (
    <header className="border-b border-toss-border bg-toss-surface">
      <div className="mx-auto w-full max-w-5xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <button type="button" className="inline-block text-xl font-extrabold tracking-tight text-toss-text" aria-label="voca3000 홈" onClick={onHome}>
              voca<span className="text-toss-blue">3000</span>
            </button>
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <span className="rounded-full bg-toss-ice-blue px-2 py-0.5 font-semibold text-toss-blue">{language === 'ja' ? '일본어' : '영어'}</span>
              <strong className="text-toss-text">Day {String(day).padStart(2, '0')}</strong>
              <span aria-hidden="true" className="text-toss-border">·</span>
              <span className="text-toss-muted">{category}</span>
              <span className={completedStudy ? 'inline-flex items-center gap-1 font-medium text-toss-success' : 'text-toss-muted'}>
                {completedStudy ? <CheckCircle2 className="size-4" aria-hidden="true" /> : null}
                {completedStudy ? '학습 완료' : '학습 전'}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ProgressBar
              value={masteredCount}
              max={totalCount}
              label="외운 단어"
              className="w-20 sm:w-28"
              compact
            />
            <button
              type="button"
              className="inline-flex size-9 items-center justify-center rounded-[10px] border border-toss-border bg-toss-surface text-toss-text transition-colors hover:bg-toss-bg motion-reduce:transition-none"
              onClick={onHome}
              aria-label="언어 선택으로 돌아가기"
            >
              <House className="size-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="inline-flex size-9 items-center justify-center rounded-[10px] border border-toss-border bg-toss-surface text-toss-text transition-colors hover:bg-toss-bg disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
              onClick={onBackup}
              disabled={onBackup === undefined}
              aria-label="학습 데이터 백업 및 복원"
              title={onBackup === undefined ? '백업 기능 준비 중' : undefined}
            >
              <DatabaseBackup className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
