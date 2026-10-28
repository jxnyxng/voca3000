import { useMemo, useRef, useState } from 'react'
import type { VocaDatabase } from '../../db'
import { useWordProgress } from '../../hooks/useWordProgress'
import type { CustomSongContent } from '../../types/content'
import type { AppTab } from '../../types/navigation'
import type { QuizMode } from '../../types/word'
import { Header } from '../common/Header'
import { DayLearningTabs } from '../day/DayLearningTabs'

interface CustomSongLearningProps {
  song: CustomSongContent
  database: VocaDatabase
  onBack: () => void
}

export function CustomSongLearning({ song, database, onBack }: CustomSongLearningProps) {
  const [selectedTab, setSelectedTab] = useState<AppTab>('study')
  const [direction, setDirection] = useState<QuizMode>('ko-to-en')
  const containerRef = useRef<HTMLDivElement>(null)
  const wordIds = useMemo(() => song.words.map(({ id }) => id), [song.words])
  const progress = useWordProgress({ wordIds, contentId: song.contentId, database })
  const selectTab = (tab: AppTab): void => {
    if (tab === 'ko-to-en' || tab === 'en-to-ko') setDirection(tab)
    setSelectedTab(tab)
  }
  const selectDirection = (nextDirection: QuizMode): void => {
    setDirection(nextDirection)
    if (selectedTab === 'ko-to-en' || selectedTab === 'en-to-ko') setSelectedTab(nextDirection)
  }

  return (
    <div className={`min-h-dvh bg-toss-bg ${song.language === 'ja' ? 'theme-japanese' : ''}`}>
      <Header
        language={song.language}
        day={1}
        category={song.title}
        masteredCount={progress.masteredCount}
        totalCount={song.words.length}
        onHome={onBack}
        selectedTab={selectedTab}
        onSelectTab={selectTab}
        direction={direction}
        onSelectDirection={selectDirection}
      />
      <main className="mx-auto w-full max-w-4xl px-4 py-1 sm:px-6 sm:py-2 lg:px-8">
        <DayLearningTabs
          containerRef={containerRef}
          language={song.language}
          words={song.words}
          day={1}
          contentId={song.contentId}
          selectedTab={selectedTab}
          direction={direction}
          database={database}
          progressByWordId={progress.progressByWordId}
          completedStudy={progress.daySession?.completedStudy ?? false}
          onSelectTab={selectTab}
          onNavigateToIncorrect={(direction) => {
            setDirection(direction)
            setSelectedTab('incorrect')
          }}
          onToggleMastered={progress.toggleMastered}
          onToggleFavorite={progress.toggleFavorite}
          onStudyComplete={progress.markStudyCompleted}
        />
      </main>
    </div>
  )
}
