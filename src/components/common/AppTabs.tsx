import { Fragment, useId, useRef, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { APP_TABS, type AppTab } from '../../types/navigation'
import { cn } from '../../utils/cn'
import { SlidingPillIndicator } from './SlidingPillIndicator'
import type { StudyLanguage } from '../../types/word'

const TAB_LABELS: Record<AppTab, string> = {
  study: '단어장',
  'ko-to-en': '한→영',
  'en-to-ko': '영→한',
  incorrect: '오답노트',
}

export interface AppTabsProps {
  selectedTab: AppTab
  onSelectTab: (tab: AppTab) => void
  panels: Record<AppTab, ReactNode>
  contentKey?: string | number
  language?: StudyLanguage
}

export function AppTabs({ selectedTab, onSelectTab, panels, contentKey = 'default', language = 'en' }: AppTabsProps) {
  const idPrefix = useId()
  const indicatorId = `${idPrefix}-main-tab-indicator`
  const tabRefs = useRef(new Map<AppTab, HTMLButtonElement>())

  const selectAt = (index: number): void => {
    const tab = APP_TABS[index]
    if (tab === undefined) return
    onSelectTab(tab)
    tabRefs.current.get(tab)?.focus()
  }

  return (
    <div className="min-w-0">
      <div className="mx-auto flex w-fit max-w-full items-center gap-1 overflow-x-auto rounded-full border border-toss-border bg-toss-surface p-1 shadow-toss" role="tablist" aria-label="단어장, 테스트 및 오답노트">
        {APP_TABS.map((tab, index) => {
          const isSelected = selectedTab === tab
          return (
            <Fragment key={tab}>
              {(index === 1 || index === 3) ? (
                <span className="mx-1 h-5 w-px shrink-0 bg-toss-border" aria-hidden="true" />
              ) : null}
              <button
                ref={(node) => {
                  if (node) tabRefs.current.set(tab, node)
                  else tabRefs.current.delete(tab)
                }}
                id={`${idPrefix}-${tab}-tab`}
                type="button"
                role="tab"
                aria-selected={isSelected}
                aria-controls={`${idPrefix}-${tab}-panel`}
                aria-label={tab === 'ko-to-en' ? `테스트 한→${language === 'ja' ? '일' : '영'}` : tab === 'en-to-ko' ? `테스트 ${language === 'ja' ? '일' : '영'}→한` : TAB_LABELS[tab]}
                tabIndex={isSelected ? 0 : -1}
                className={cn(
                  'relative isolate min-h-9 w-20 shrink-0 rounded-full px-3 text-xs font-bold transition-colors motion-reduce:transition-none',
                  isSelected
                    ? 'text-white'
                    : 'text-toss-muted hover:bg-toss-bg hover:text-toss-text',
                )}
                onClick={() => onSelectTab(tab)}
                onKeyDown={(event) => {
                  const lastIndex = APP_TABS.length - 1
                  if (event.key === 'ArrowRight') {
                    event.preventDefault()
                    selectAt((index + 1) % APP_TABS.length)
                  } else if (event.key === 'ArrowLeft') {
                    event.preventDefault()
                    selectAt((index - 1 + APP_TABS.length) % APP_TABS.length)
                  } else if (event.key === 'Home') {
                    event.preventDefault()
                    selectAt(0)
                  } else if (event.key === 'End') {
                    event.preventDefault()
                    selectAt(lastIndex)
                  }
                }}
              >
                {isSelected ? <SlidingPillIndicator layoutId={indicatorId} className="bg-toss-blue shadow-sm" /> : null}
                <span className="relative z-10">{tab === 'ko-to-en' ? `한→${language === 'ja' ? '일' : '영'}` : tab === 'en-to-ko' ? `${language === 'ja' ? '일' : '영'}→한` : TAB_LABELS[tab]}</span>
              </button>
            </Fragment>
          )
        })}
      </div>
      <div className="relative min-w-0">
        {APP_TABS.map((tab) => {
          const isSelected = selectedTab === tab
          return (
            <motion.div
              key={`${contentKey}-${tab}`}
              id={`${idPrefix}-${tab}-panel`}
              role="tabpanel"
              aria-labelledby={`${idPrefix}-${tab}-tab`}
              aria-hidden={!isSelected}
              inert={isSelected ? undefined : true}
              hidden={!isSelected}
              tabIndex={isSelected ? 0 : -1}
              initial={{ opacity: 0, y: 14 }}
              animate={isSelected ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="min-w-0 max-w-full pt-4"
            >
              {panels[tab]}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
