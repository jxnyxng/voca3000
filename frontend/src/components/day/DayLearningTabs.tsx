import { lazy, Suspense, type Ref } from 'react'
import type { VocaDatabase } from '../../db'
import type { UserProgressRecord } from '../../types/progress'
import type { AppTab } from '../../types/navigation'
import type { QuizMode, StudyLanguage, WordItem } from '../../types/word'
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
  return <LoadingState message="학습 화면을 준비하고 있어요." variant="card" delayMs={250} />
}

interface DayLearningTabsProps {
  containerRef: Ref<HTMLDivElement>
  language: StudyLanguage
  words: readonly WordItem[]
  day: number
  contentId: LearningContentId
  selectedTab: AppTab
  direction: QuizMode
  database: VocaDatabase
  progressByWordId: ReadonlyMap<string, UserProgressRecord>
  completedStudy: boolean
  onSelectTab: (tab: AppTab) => void
  onNavigateToIncorrect: (direction: QuizMode) => void
  onToggleMastered: (wordId: string) => Promise<boolean>
  onToggleFavorite: (wordId: string) => Promise<boolean>
  onStudyComplete: () => Promise<void>
  onOpenWordList?: () => void
}

export function DayLearningTabs({
  containerRef,
  words,
  day,
  contentId,
  selectedTab,
  direction,
  database,
  progressByWordId,
  completedStudy,
  onSelectTab,
  onNavigateToIncorrect,
  onToggleMastered,
  onToggleFavorite,
  onStudyComplete,
  onOpenWordList,
}: DayLearningTabsProps) {
  return (
    <div
      ref={containerRef}
      data-day={day}
    >
      <AppTabs
        selectedTab={selectedTab}
        panels={{
          study: (
            <StudyDeck
              key={day}
              words={words}
              progressByWordId={progressByWordId}
              completedStudy={completedStudy}
              direction={direction}
              onToggleMastered={onToggleMastered}
              onToggleFavorite={onToggleFavorite}
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
                onNavigate={(tab) => tab === 'incorrect' ? onNavigateToIncorrect('ko-to-en') : onSelectTab(tab)}
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
                onNavigate={(tab) => tab === 'incorrect' ? onNavigateToIncorrect('en-to-ko') : onSelectTab(tab)}
              />
            </Suspense>
          ),
          incorrect: (
            <Suspense fallback={<PanelLoadingState />}>
              <IncorrectNote words={words} contentId={contentId} database={database} direction={direction} />
            </Suspense>
          ),
        }}
      />
    </div>
  )
}
