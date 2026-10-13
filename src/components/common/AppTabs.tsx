import { useId, useRef, type ReactNode } from 'react'
import { APP_TABS, type AppTab } from '../../types/navigation'
import { cn } from '../../utils/cn'

const TAB_LABELS: Record<AppTab, string> = {
  study: '학습',
  'ko-to-en': '한→영',
  'en-to-ko': '영→한',
  incorrect: '오답노트',
}

export interface AppTabsProps {
  selectedTab: AppTab
  onSelectTab: (tab: AppTab) => void
  panels: Record<AppTab, ReactNode>
}

export function AppTabs({ selectedTab, onSelectTab, panels }: AppTabsProps) {
  const idPrefix = useId()
  const tabRefs = useRef(new Map<AppTab, HTMLButtonElement>())

  const selectAt = (index: number): void => {
    const tab = APP_TABS[index]
    if (tab === undefined) return
    onSelectTab(tab)
    tabRefs.current.get(tab)?.focus()
  }

  return (
    <div>
      <div className="mx-auto flex w-fit max-w-full gap-1 overflow-x-auto rounded-full border border-toss-border bg-toss-surface p-1 shadow-toss" role="tablist" aria-label="학습 모드">
        {APP_TABS.map((tab, index) => {
          const isSelected = selectedTab === tab
          return (
            <button
              key={tab}
              ref={(node) => {
                if (node) tabRefs.current.set(tab, node)
                else tabRefs.current.delete(tab)
              }}
              id={`${idPrefix}-${tab}-tab`}
              type="button"
              role="tab"
              aria-selected={isSelected}
              aria-controls={`${idPrefix}-${tab}-panel`}
              tabIndex={isSelected ? 0 : -1}
              className={cn(
                'min-h-9 w-20 shrink-0 rounded-full px-3 text-xs font-bold transition-colors motion-reduce:transition-none',
                isSelected
                  ? 'bg-toss-blue text-white shadow-sm'
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
              {TAB_LABELS[tab]}
            </button>
          )
        })}
      </div>
      {APP_TABS.map((tab) => (
        <div
          key={tab}
          id={`${idPrefix}-${tab}-panel`}
          role="tabpanel"
          aria-labelledby={`${idPrefix}-${tab}-tab`}
          tabIndex={0}
          hidden={selectedTab !== tab}
          className="pt-4"
        >
          {panels[tab]}
        </div>
      ))}
    </div>
  )
}
