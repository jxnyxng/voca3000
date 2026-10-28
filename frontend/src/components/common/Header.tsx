import type { ReactNode } from 'react'
import { ProgressBar } from './ProgressBar'
import { BrandLogo } from './BrandLogo'
import type { QuizMode, StudyLanguage } from '../../types/word'
import type { AppTab } from '../../types/navigation'

const HEADER_TABS = [
  { key: 'study', label: '단어장', route: 'study' },
  { key: 'quiz', label: '테스트', route: 'ko-to-en' },
  { key: 'incorrect', label: '오답노트', route: 'incorrect' },
] as const

export interface HeaderProps {
  day: number
  category: string
  masteredCount: number
  totalCount: number
  onHome?: () => void
  accountControl?: ReactNode
  language?: StudyLanguage
  selectedTab?: AppTab
  onSelectTab?: (tab: AppTab) => void
  direction?: QuizMode
  onSelectDirection?: (direction: QuizMode) => void
}

export function Header({ day, category, masteredCount, totalCount, onHome, accountControl, language = 'en', selectedTab, onSelectTab, direction = 'ko-to-en', onSelectDirection }: HeaderProps) {
  const selectedSection = selectedTab === 'ko-to-en' || selectedTab === 'en-to-ko' ? 'quiz' : selectedTab
  const targetShort = language === 'ja' ? '일' : '영'
  return (
    <header className="bg-toss-surface">
      <div className={`mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 ${selectedTab && onSelectTab ? 'pt-3 sm:pt-4' : 'py-3 sm:py-4'}`}>
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
            {accountControl}
          </div>
        </div>
        <div className="mt-1.5 flex min-w-0 items-center gap-2">
          <span className="min-w-0 flex-1 truncate whitespace-nowrap text-xs text-toss-muted" title={category}>{category}</span>
          <ProgressBar
            value={masteredCount}
            max={totalCount}
            label="외운단어"
            className="w-40 shrink-0 sm:w-48"
            compact
          />
        </div>
        {selectedTab && onSelectTab ? (
          <div className="relative z-10 mt-3 flex items-end justify-between gap-2 overflow-x-auto">
          <div className="flex shrink-0 gap-0" role="tablist" aria-label="학습 영역">
            {HEADER_TABS.map(({ key, label, route }, index) => (
              <button
                key={key}
                id={`learning-tab-${key}`}
                type="button"
                role="tab"
                aria-selected={selectedSection === key}
                aria-controls={`learning-panel-${key === 'quiz' ? direction : key}`}
                tabIndex={selectedSection === key ? 0 : -1}
                className={`min-h-9 shrink-0 rounded-t-lg rounded-b-none px-3 text-xs font-bold transition-colors sm:px-4 ${selectedSection === key ? 'bg-toss-blue text-white' : 'bg-toss-surface text-toss-muted hover:text-toss-text'}`}
                onClick={() => onSelectTab(key === 'quiz' ? direction : route)}
                onKeyDown={(event) => {
                  const nextIndex = event.key === 'ArrowRight' ? (index + 1) % HEADER_TABS.length
                    : event.key === 'ArrowLeft' ? (index - 1 + HEADER_TABS.length) % HEADER_TABS.length
                      : event.key === 'Home' ? 0 : event.key === 'End' ? HEADER_TABS.length - 1 : -1
                  if (nextIndex < 0) return
                  event.preventDefault()
                  const next = HEADER_TABS[nextIndex]
                  onSelectTab(next.key === 'quiz' ? direction : next.route)
                  document.getElementById(`learning-tab-${next.key}`)?.focus()
                }}
              >
                {label}
              </button>
            ))}
          </div>
          {onSelectDirection ? (
          <div className="flex shrink-0 gap-0" role="tablist" aria-label="학습 방향">
            {(['ko-to-en', 'en-to-ko'] as const).map((mode) => (
              <button
                key={mode}
                id={`learning-direction-${mode}`}
                type="button"
                role="tab"
                aria-selected={direction === mode}
                aria-controls={`learning-panel-${selectedSection === 'quiz' ? mode : selectedTab}`}
                tabIndex={direction === mode ? 0 : -1}
                className={`min-h-9 shrink-0 rounded-t-lg rounded-b-none px-3 text-xs font-bold transition-colors sm:px-4 ${direction === mode ? 'bg-toss-blue text-white' : 'bg-toss-surface text-toss-muted hover:text-toss-text'}`}
                onClick={() => onSelectDirection(mode)}
                onKeyDown={(event) => {
                  if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft' && event.key !== 'Home' && event.key !== 'End') return
                  event.preventDefault()
                  const next = event.key === 'Home' || event.key === 'ArrowLeft' ? 'ko-to-en' : 'en-to-ko'
                  onSelectDirection(next)
                  document.getElementById(`learning-direction-${next}`)?.focus()
                }}
              >
                {mode === 'ko-to-en' ? `한→${targetShort}` : `${targetShort}→한`}
              </button>
            ))}
          </div>
          ) : null}
          </div>
        ) : null}
      </div>
    </header>
  )
}
