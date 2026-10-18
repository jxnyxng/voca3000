import { motion } from 'motion/react'
import type { Ref } from 'react'
import type { VocaDatabase } from '../../db'
import type { UserProgressRecord } from '../../types/progress'
import type { AppTab } from '../../types/navigation'
import type { StudyLanguage, WordItem } from '../../types/word'
import { AppTabs } from '../common/AppTabs'
import { IncorrectNote } from '../quiz/IncorrectNote'
import { QuizCard } from '../quiz/QuizCard'
import { StudyDeck } from '../study/StudyDeck'

interface DayLearningTabsProps {
  containerRef: Ref<HTMLDivElement>
  language: StudyLanguage
  words: readonly WordItem[]
  day: number
  selectedTab: AppTab
  database: VocaDatabase
  progressByWordId: ReadonlyMap<string, UserProgressRecord>
  completedStudy: boolean
  onSelectTab: (tab: AppTab) => void
  onToggleMastered: (wordId: string) => Promise<boolean>
  onStudyComplete: () => Promise<void>
  onOpenWordList: () => void
}

export function DayLearningTabs({
  containerRef,
  language,
  words,
  day,
  selectedTab,
  database,
  progressByWordId,
  completedStudy,
  onSelectTab,
  onToggleMastered,
  onStudyComplete,
  onOpenWordList,
}: DayLearningTabsProps) {
  return (
    <motion.div
      ref={containerRef}
      key={`loaded-day-${day}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
    >
      <AppTabs
        language={language}
        selectedTab={selectedTab}
        onSelectTab={onSelectTab}
        contentKey={day}
        panels={{
          study: (
            <StudyDeck
              key={day}
              words={words}
              progressByWordId={progressByWordId}
              completedStudy={completedStudy}
              onToggleMastered={onToggleMastered}
              onStudyComplete={onStudyComplete}
              onOpenWordList={onOpenWordList}
            />
          ),
          'ko-to-en': (
            <QuizCard
              key={`${day}-ko-to-en`}
              words={words}
              day={day}
              mode="ko-to-en"
              database={database}
              onNavigate={onSelectTab}
            />
          ),
          'en-to-ko': (
            <QuizCard
              key={`${day}-en-to-ko`}
              words={words}
              day={day}
              mode="en-to-ko"
              database={database}
              onNavigate={onSelectTab}
            />
          ),
          incorrect: <IncorrectNote words={words} database={database} />,
        }}
      />
    </motion.div>
  )
}
