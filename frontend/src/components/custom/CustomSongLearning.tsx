import { useMemo, useRef, useState } from 'react'
import type { VocaDatabase } from '../../db'
import { useWordProgress } from '../../hooks/useWordProgress'
import type { CustomSongContent } from '../../types/content'
import type { AppTab } from '../../types/navigation'
import { Header } from '../common/Header'
import { DayLearningTabs } from '../day/DayLearningTabs'

interface CustomSongLearningProps {
  song: CustomSongContent
  database: VocaDatabase
  onBack: () => void
}

export function CustomSongLearning({ song, database, onBack }: CustomSongLearningProps) {
  const [selectedTab, setSelectedTab] = useState<AppTab>('study')
  const containerRef = useRef<HTMLDivElement>(null)
  const wordIds = useMemo(() => song.words.map(({ id }) => id), [song.words])
  const progress = useWordProgress({ wordIds, contentId: song.contentId, database })

  return (
    <div className={`min-h-dvh bg-toss-bg ${song.language === 'ja' ? 'theme-japanese' : ''}`}>
      <Header
        language={song.language}
        day={1}
        category={song.title}
        completedStudy={progress.daySession?.completedStudy ?? false}
        masteredCount={progress.masteredCount}
        totalCount={song.words.length}
        onHome={onBack}
      />
      <main className="mx-auto w-full max-w-4xl px-4 py-5 sm:px-6 lg:px-8">
        <DayLearningTabs
          containerRef={containerRef}
          language={song.language}
          words={song.words}
          day={1}
          contentId={song.contentId}
          selectedTab={selectedTab}
          database={database}
          progressByWordId={progress.progressByWordId}
          completedStudy={progress.daySession?.completedStudy ?? false}
          onSelectTab={setSelectedTab}
          onToggleMastered={progress.toggleMastered}
          onStudyComplete={progress.markStudyCompleted}
        />
      </main>
    </div>
  )
}
