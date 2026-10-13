import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { AppTabs } from './components/common/AppTabs'
import { BackupModal } from './components/common/BackupModal'
import { EmptyState } from './components/common/EmptyState'
import { ErrorState } from './components/common/ErrorState'
import { Header } from './components/common/Header'
import { LoadingState } from './components/common/LoadingState'
import { DaySelector } from './components/day/DaySelector'
import { LandingPage } from './components/home/LandingPage'
import { QuizCard } from './components/quiz/QuizCard'
import { IncorrectNote } from './components/quiz/IncorrectNote'
import { StudyDeck } from './components/study/StudyDeck'
import { db, type VocaDatabase } from './db'
import { useDaySelection } from './hooks/useDaySelection'
import { useWordProgress } from './hooks/useWordProgress'
import {
  wordRepository,
  type WordRepository,
  WordRepositoryError,
} from './services/wordRepository'
import type { AppTab } from './types/navigation'
import type { DayIndexItem, WordItem } from './types/word'

type AppWordRepository = Pick<
  WordRepository,
  'clearCache' | 'getDayIndex' | 'getWordsForDay'
>

export interface AppProps {
  repository?: AppWordRepository
  database?: VocaDatabase
}

interface IndexState {
  days: DayIndexItem[] | null
  error: Error | null
}

interface DayDataState {
  wordsByDay: Map<number, WordItem[]>
  loadingDay: number | undefined
  error: Error | null
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error('데이터를 불러오지 못했어요.', { cause: error })
}

function userMessage(error: Error): string {
  return error instanceof WordRepositoryError ? error.userMessage : '데이터를 불러오지 못했어요. 다시 시도해 주세요.'
}

interface LoadedAppProps {
  days: DayIndexItem[]
  repository: AppWordRepository
  database: VocaDatabase
  onHome: () => void
}

function LoadedApp({ days, repository, database, onHome }: LoadedAppProps) {
  const [selectedTab, setSelectedTab] = useState<AppTab>('study')
  const [isBackupOpen, setIsBackupOpen] = useState(false)
  const [dayData, setDayData] = useState<DayDataState>({
    wordsByDay: new Map(),
    loadingDay: undefined,
    error: null,
  })
  const [dayLoadRetry, setDayLoadRetry] = useState(0)
  const prepareDay = useCallback(
    async (day: number): Promise<void> => {
      if (dayData.wordsByDay.has(day)) return
      setDayData((current) => ({ ...current, loadingDay: day, error: null }))
      try {
        const words = await repository.getWordsForDay(day)
        setDayData((current) => {
          const wordsByDay = new Map(current.wordsByDay)
          wordsByDay.set(day, words)
          return { wordsByDay, loadingDay: undefined, error: null }
        })
      } catch (error) {
        const normalizedError = toError(error)
        setDayData((current) => ({ ...current, loadingDay: undefined, error: normalizedError }))
        throw normalizedError
      }
    },
    [dayData.wordsByDay, repository],
  )
  const { selectedDay, pendingDay, selectionError, selectDay } = useDaySelection({
    days,
    prepareDay,
  })
  const selectedDayItem = days.find(({ day }) => day === selectedDay) ?? days[0]!
  const words = dayData.wordsByDay.get(selectedDayItem.day)
  const wordIds = useMemo(() => words?.map(({ id }) => id) ?? [], [words])
  const progress = useWordProgress({ wordIds, day: selectedDayItem.day, database })
  const [completedDaysRetry, setCompletedDaysRetry] = useState(0)
  const completedDaysSnapshot = useLiveQuery(
    async () => {
      try {
        const sessions = await database.daySessions.toArray()
        return {
          days: new Set(sessions.filter(({ completedStudy }) => completedStudy).map(({ day }) => day)),
          error: null,
        }
      } catch (error) {
        return { days: new Set<number>(), error: toError(error) }
      }
    },
    [database, completedDaysRetry],
  )

  useEffect(() => {
    let active = true
    void repository
      .getWordsForDay(selectedDayItem.day)
      .then((loadedWords) => {
        if (!active) return
        setDayData((current) => {
          const wordsByDay = new Map(current.wordsByDay)
          wordsByDay.set(selectedDayItem.day, loadedWords)
          return { wordsByDay, loadingDay: undefined, error: null }
        })
      })
      .catch((error: unknown) => {
        if (active) {
          setDayData((current) => ({
            ...current,
            loadingDay: undefined,
            error: toError(error),
          }))
        }
      })
    return () => {
      active = false
    }
  }, [dayLoadRetry, repository, selectedDayItem.day])

  const handleDaySelect = async (day: number): Promise<void> => {
    if (await selectDay(day)) {
      setSelectedTab('study')
      setDayData((current) => ({ ...current, error: null }))
    }
  }

  const retrySelectedDay = (): void => {
    setDayData((current) => ({ ...current, error: null }))
    setDayLoadRetry((count) => count + 1)
  }

  const completedDays = completedDaysSnapshot?.days ?? new Set<number>()
  const dbError = progress.error ?? completedDaysSnapshot?.error ?? null
  const dayError = selectionError ?? dayData.error
  const isDayLoading =
    words === undefined &&
    (dayData.loadingDay === selectedDayItem.day || dayData.error === null)
  const getKnownWordIds = useCallback(async (): Promise<ReadonlySet<string>> => {
    const allWords = await Promise.all(days.map(({ day }) => repository.getWordsForDay(day)))
    return new Set(allWords.flat().map(({ id }) => id))
  }, [days, repository])

  return (
    <div className="flex min-h-dvh flex-col bg-toss-bg">
      <Header
        day={selectedDayItem.day}
        category={`${selectedDayItem.category} · ${selectedDayItem.titleKo}`}
        completedStudy={progress.daySession?.completedStudy ?? false}
        masteredCount={progress.masteredCount}
        totalCount={selectedDayItem.wordCount}
        onBackup={() => setIsBackupOpen(true)}
        onHome={onHome}
      />
      <main className="mx-auto grid w-full max-w-5xl flex-1 gap-4 px-4 py-4 sm:px-6 sm:py-5 lg:min-h-0 lg:grid-cols-[4.5rem_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)] lg:gap-6 lg:px-8">
        <aside className="min-w-0 lg:sticky lg:top-4 lg:h-[calc(100dvh-9rem)] lg:min-h-0 lg:self-start">
          <DaySelector
            days={days}
            selectedDay={selectedDayItem.day}
            completedDays={completedDays}
            pendingDay={pendingDay ?? dayData.loadingDay}
            errorMessage={selectionError ? userMessage(selectionError) : undefined}
            onSelectDay={(day) => void handleDaySelect(day)}
          />
        </aside>
        <div className="flex min-w-0 flex-col gap-6 lg:min-h-0">
          {dbError ? (
            <ErrorState
              title="학습 기록을 불러오지 못했어요"
              message="브라우저 저장소를 확인한 뒤 다시 시도해 주세요. 단어 학습 데이터는 그대로 이용할 수 있어요."
              onRetry={() => {
                progress.retry()
                setCompletedDaysRetry((count) => count + 1)
              }}
            />
          ) : null}
          {isDayLoading ? <LoadingState message={`Day ${selectedDayItem.day} 단어를 불러오고 있어요.`} /> : null}
          {!isDayLoading && words === undefined && dayError ? (
            <ErrorState message={userMessage(dayError)} onRetry={retrySelectedDay} />
          ) : null}
          {words && progress.isLoading ? (
            <LoadingState message="저장된 학습 기록을 불러오고 있어요." delayMs={250} />
          ) : null}
          {words && !progress.isLoading ? (
            <AppTabs
              selectedTab={selectedTab}
              onSelectTab={setSelectedTab}
              contentKey={selectedDayItem.day}
              panels={{
                study: (
                  <StudyDeck
                    key={selectedDayItem.day}
                    words={words}
                    progressByWordId={progress.progressByWordId}
                    completedStudy={progress.daySession?.completedStudy ?? false}
                    onToggleMastered={progress.toggleMastered}
                    onStudyComplete={progress.markStudyCompleted}
                  />
                ),
                'ko-to-en': (
                  <QuizCard key={`${selectedDayItem.day}-ko-to-en`} words={words} day={selectedDayItem.day} mode="ko-to-en" database={database} onNavigate={setSelectedTab} />
                ),
                'en-to-ko': (
                  <QuizCard key={`${selectedDayItem.day}-en-to-ko`} words={words} day={selectedDayItem.day} mode="en-to-ko" database={database} onNavigate={setSelectedTab} />
                ),
                incorrect: (
                  <IncorrectNote words={words} database={database} />
                ),
              }}
            />
          ) : null}
        </div>
      </main>
      {isBackupOpen ? <BackupModal database={database} getKnownWordIds={getKnownWordIds} onClose={() => setIsBackupOpen(false)} /> : null}
    </div>
  )
}

export default function App({ repository = wordRepository, database = db }: AppProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<'home' | 'english'>('home')
  const [retryCount, setRetryCount] = useState(0)
  const [indexState, setIndexState] = useState<IndexState>({ days: null, error: null })

  useEffect(() => {
    if (selectedLanguage === 'home') return
    let active = true
    void repository
      .getDayIndex()
      .then((days) => {
        if (active) setIndexState({ days, error: null })
      })
      .catch((error: unknown) => {
        if (active) setIndexState({ days: null, error: toError(error) })
      })
    return () => {
      active = false
    }
  }, [repository, retryCount, selectedLanguage])

  if (selectedLanguage === 'home') {
    return <LandingPage onSelectEnglish={() => setSelectedLanguage('english')} />
  }

  if (indexState.error) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <ErrorState
          title="Day 목록을 불러오지 못했어요"
          message={userMessage(indexState.error)}
          onRetry={() => {
            repository.clearCache()
            setIndexState({ days: null, error: null })
            setRetryCount((count) => count + 1)
          }}
        />
      </main>
    )
  }

  if (indexState.days === null) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <LoadingState message="학습 Day 목록을 불러오고 있어요." />
      </main>
    )
  }

  if (indexState.days.length === 0) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <EmptyState title="학습할 Day가 없어요" description="배포된 단어 데이터가 준비되면 여기에서 학습을 시작할 수 있어요." />
      </main>
    )
  }

  return (
    <LoadedApp
      days={indexState.days}
      repository={repository}
      database={database}
      onHome={() => setSelectedLanguage('home')}
    />
  )
}
