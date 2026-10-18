import { LoadedApp, type AppWordRepository } from './components/app/LoadedApp'
import { EmptyState } from './components/common/EmptyState'
import { ErrorState } from './components/common/ErrorState'
import { LoadingState } from './components/common/LoadingState'
import { LandingPage } from './components/home/LandingPage'
import { CustomSongsPage } from './components/custom/CustomSongsPage'
import { db, type VocaDatabase } from './db'
import { useDayIndex } from './hooks/useDayIndex'
import { useHashRoute } from './hooks/useHashRoute'
import { japaneseWordRepository, wordRepository } from './services/wordRepository'
import { userMessage } from './utils/userMessage'

export interface AppProps {
  repository?: AppWordRepository
  database?: VocaDatabase
}

export default function App({ repository = wordRepository, database = db }: AppProps) {
  const { route, navigate } = useHashRoute()
  const selectedLanguage = route.language
  const activeRepository = selectedLanguage === 'japanese' ? japaneseWordRepository : repository
  const activeDatabase = database
  const index = useDayIndex(
    activeRepository,
    selectedLanguage === 'english' || selectedLanguage === 'japanese' ? selectedLanguage : undefined,
  )

  if (selectedLanguage === 'home') {
    return <LandingPage onSelectEnglish={() => navigate({ language: 'english', day: 1, tab: 'study' })} onSelectJapanese={() => navigate({ language: 'japanese', day: 1, tab: 'study' })} onSelectCustom={() => navigate({ language: 'custom', day: 1, tab: 'study' })} />
  }

  if (selectedLanguage === 'custom') {
    return (
      <CustomSongsPage
        database={database}
        selectedContentId={route.customSongId}
        loadVocabulary={async (language) => {
          const source = language === 'ja' ? japaneseWordRepository : repository
          const sourceDays = await source.getDayIndex()
          return (await Promise.all(sourceDays.map(({ day }) => source.getWordsForDay(day)))).flat()
        }}
        onSelectSong={(customSongId) => navigate({ language: 'custom', day: 1, tab: 'study', customSongId })}
        onCustomHome={() => navigate({ language: 'custom', day: 1, tab: 'study' })}
        onHome={() => navigate({ language: 'home', day: 1, tab: 'study' })}
      />
    )
  }

  if (index.error) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <ErrorState
          title="Day 목록을 불러오지 못했어요"
          message={userMessage(index.error)}
          onRetry={index.retry}
        />
      </main>
    )
  }

  if (index.days === null) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <LoadingState message="학습 Day 목록을 불러오고 있어요." />
      </main>
    )
  }

  if (index.days.length === 0) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <EmptyState title="학습할 Day가 없어요" description="배포된 단어 데이터가 준비되면 여기에서 학습을 시작할 수 있어요." />
      </main>
    )
  }

  return (
    <LoadedApp
      key={selectedLanguage}
      days={index.days}
      repository={activeRepository}
      backupRepositories={[repository, japaneseWordRepository]}
      database={activeDatabase}
      routeDay={route.day}
      routeTab={route.tab}
      onRouteChange={(day, tab) => navigate({ language: selectedLanguage, day, tab })}
      onHome={() => navigate({ language: 'home', day: 1, tab: 'study' })}
    />
  )
}
