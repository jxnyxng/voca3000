import { useEffect, useState, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { APP_TABS, type AppTab } from '../../types/navigation'
import { cn } from '../../utils/cn'

export interface AppTabsProps {
  selectedTab: AppTab
  onSelectTab?: (tab: AppTab) => void
  panels: Record<AppTab, ReactNode>
  contentKey?: string | number
}

export function AppTabs({ selectedTab, panels, contentKey = 'default' }: AppTabsProps) {
  const [visitedTabs, setVisitedTabs] = useState(() => new Set<AppTab>([selectedTab]))
  const [visibleTab, setVisibleTab] = useState(selectedTab)
  const [isExiting, setIsExiting] = useState(false)
  if (!visitedTabs.has(selectedTab)) {
    setVisitedTabs(new Set(visitedTabs).add(selectedTab))
  }

  useEffect(() => {
    if (selectedTab !== visibleTab) setIsExiting(true)
    else setIsExiting(false)
  }, [selectedTab, visibleTab])

  return (
    <div className="min-w-0">
      <div className="relative min-w-0">
        {APP_TABS.map((tab) => {
          const isVisible = visibleTab === tab
          return (
            <motion.div
              key={`${contentKey}-${tab}`}
              id={`learning-panel-${tab}`}
              role="tabpanel"
              aria-labelledby={`learning-tab-${tab === 'ko-to-en' || tab === 'en-to-ko' ? 'quiz' : tab}`}
              aria-hidden={!isVisible || isExiting}
              inert={isVisible && !isExiting ? undefined : true}
              hidden={!isVisible}
              tabIndex={isVisible && !isExiting ? 0 : -1}
              initial={false}
              animate={isVisible
                ? isExiting ? { opacity: 0, y: -10 } : { opacity: 1, y: 0 }
                : { opacity: 0, y: 0 }}
              transition={isVisible && isExiting
                ? { duration: 0.18, ease: [0.16, 1, 0.3, 1] }
                : { duration: 0 }}
              onAnimationComplete={() => {
                if (isVisible && isExiting) {
                  setVisibleTab(selectedTab)
                  setIsExiting(false)
                }
              }}
              className={cn(
                'min-w-0 max-w-full pt-1 sm:pt-2',
                (tab === 'ko-to-en' || tab === 'en-to-ko') && 'flex min-h-[calc(100dvh-15rem)] flex-col justify-center sm:min-h-[calc(100dvh-14rem)] lg:min-h-[calc(100dvh-12rem)]',
              )}
            >
              <div className={cn(
                tab !== 'incorrect' && 'relative',
                (tab === 'ko-to-en' || tab === 'en-to-ko') && 'sm:-top-4 lg:-top-10',
              )}>
                {visitedTabs.has(tab) || isVisible ? panels[tab] : null}
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
