import { CheckCircle2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { ProgressBar } from './ProgressBar'
import { BrandLogo } from './BrandLogo'
import type { StudyLanguage } from '../../types/word'

export interface HeaderProps {
  day: number
  category: string
  completedStudy: boolean
  masteredCount: number
  totalCount: number
  onHome?: () => void
  accountControl?: ReactNode
  language?: StudyLanguage
}

export function Header({ day, category, completedStudy, masteredCount, totalCount, onHome, accountControl, language = 'en' }: HeaderProps) {
  return (
    <header className="border-b border-toss-border bg-toss-surface">
      <div className="mx-auto w-full max-w-5xl px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <button type="button" className="shrink-0 text-xl" aria-label="워드득 홈" onClick={onHome}>
              <BrandLogo compact />
            </button>
            <div className="flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs sm:text-sm">
              <span className="rounded-full bg-toss-ice-blue px-1.5 py-0.5 font-semibold text-toss-blue sm:px-2">{language === 'ja' ? '일본어' : '영어'}</span>
              <strong className="text-toss-text">Day {String(day).padStart(2, '0')}</strong>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ProgressBar
              value={masteredCount}
              max={totalCount}
              label="외운 단어"
              className="hidden w-20 sm:block sm:w-28"
              compact
            />
            {accountControl}
          </div>
        </div>
        <div className="mt-1.5 flex min-w-0 items-center gap-2 text-sm">
          <span className="min-w-0 flex-1 truncate whitespace-nowrap text-toss-muted" title={category}>{category}</span>
          <span className={completedStudy ? 'inline-flex shrink-0 items-center gap-1 whitespace-nowrap font-medium text-toss-success' : 'shrink-0 whitespace-nowrap text-toss-muted'}>
            {completedStudy ? <CheckCircle2 className="size-4" aria-hidden="true" /> : null}
            {completedStudy ? '학습 완료' : '학습 전'}
          </span>
        </div>
      </div>
    </header>
  )
}
