import { motion } from 'motion/react'
import { lazy, Suspense, type Ref } from 'react'
import type { VocaDatabase } from '../../db'
import type { UserProgressRecord } from '../../types/progress'
import type { AppTab } from '../../types/navigation'
import type { StudyLanguage, WordItem } from '../../types/word'
import type { LearningContentId } from '../../types/content'
import { AppTabs } from '../common/AppTabs'
import { LoadingState } from '../common/LoadingState'
import { StudyDeck } from '../study/StudyDeck'

const QuizCard = lazy(async () => {
  const module = await import('../quiz/QuizCard')
  return { default: module.QuizCard }
})

const IncorrectNote = lazy(async () => {
  const module = await import('../quiz/IncorrectNote')
  return { default: module.IncorrectNote }
})

function PanelLoadingState() {
  return <LoadingState message="학습 화면을 준비하고 있어요." variant="card" />
}

interface DayLearningTabsProps {
  containerRef: Ref<HTMLDivElement>
  language: StudyLanguage
  words: readonly WordItem[]
  day: number
  contentId: LearningContentId
  selectedTab: AppTab
  database: VocaDatabase
  progressByWordId: ReadonlyMap<string, UserProgressRecord>
  completedStudy: boolean
  onSelectTab: (tab: AppTab) => void
  onToggleMastered: (wordId: string) => Promise<boolean>
  onStudyComplete: () => Promise<void>
  onOpenWordList?: () => void
}

export function DayLearningTabs({
  containerRef,
  language,
  words,
  day,
  contentId,
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
            <Suspense fallback={<PanelLoadingState />}>
              <QuizCard
                key={`${day}-ko-to-en`}
                words={words}
                day={day}
                contentId={contentId}
                mode="ko-to-en"
                database={database}
                onNavigate={onSelectTab}
              />
            </Suspense>
          ),
          'en-to-ko': (
            <Suspense fallback={<PanelLoadingState />}>
              <QuizCard
                key={`${day}-en-to-ko`}
                words={words}
                day={day}
                contentId={contentId}
                mode="en-to-ko"
                database={database}
                onNavigate={onSelectTab}
              />
            </Suspense>
          ),
          incorrect: (
            <Suspense fallback={<PanelLoadingState />}>
              <IncorrectNote words={words} contentId={contentId} database={database} />
            </Suspense>
          ),
        }}
      />
    </motion.div>
  )
}
