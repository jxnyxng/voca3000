import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { motion } from 'motion/react'
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
import { db, japaneseDb, type VocaDatabase } from './db'
import { useDaySelection } from './hooks/useDaySelection'
import { useWordProgress } from './hooks/useWordProgress'
import {
  wordRepository,
  japaneseWordRepository,
  type WordRepository,
  WordRepositoryError,
} from './services/wordRepository'
import type { AppTab } from './types/navigation'
import type { DayIndexItem, WordItem } from './types/word'

type AppLanguageRoute = 'home' | 'english' | 'japanese'

interface AppRoute {
  language: AppLanguageRoute
  day: number
  tab: AppTab
}

const TAB_TO_PATH: Record<AppTab, string> = {
  study: 'study',
  'ko-to-en': 'quiz-from-korean',
  'en-to-ko': 'quiz-to-korean',
  incorrect: 'incorrect',
}

function readRoute(): AppRoute {
  if (typeof window === 'undefined') return { language: 'home', day: 1, tab: 'study' }
  const parts = window.location.hash.replace(/^#\/?/, '').split('/').filter(Boolean)
  const language = parts[0]
  if (language !== 'english' && language !== 'japanese') {
    return { language: 'home', day: 1, tab: 'study' }
  }
  const parsedDay = parts[1] === 'day' ? Number(parts[2]) : 1
  const day = Number.isInteger(parsedDay) && parsedDay >= 1 && parsedDay <= 100 ? parsedDay : 1
  const tabPath = parts[3]
  const tab = (Object.entries(TAB_TO_PATH).find(([, path]) => path === tabPath)?.[0] ?? 'study') as AppTab
  return { language, day, tab }
}

function routeHash(route: AppRoute): string {
  if (route.language === 'home') return '#/'
  return `#/${route.language}/day/${route.day}/${TAB_TO_PATH[route.tab]}`
}

type AppWordRepository = Pick<
  WordRepository,
  'clearCache' | 'getDayIndex' | 'getWordsForDay' | 'prefetchDays'
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
  routeDay: number
  routeTab: AppTab
  onRouteChange: (day: number, tab: AppTab) => void
}

function LoadedApp({ days, repository, database, onHome, routeDay, routeTab, onRouteChange }: LoadedAppProps) {
  const language = days[0]?.language ?? 'en'
  const [isBackupOpen, setIsBackupOpen] = useState(false)
  const [dayData, setDayData] = useState<DayDataState>({
    wordsByDay: new Map(),
    loadingDay: undefined,
    error: null,
  })
  const [dayLoadRetry, setDayLoadRetry] = useState(0)
  useEffect(() => {
    void repository.prefetchDays(days.map(({ day }) => day))
  }, [days, repository])
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
  const selectedDayItem = days.find(({ day }) => day === routeDay)
    ?? days.find(({ day }) => day === selectedDay)
    ?? days[0]!
  const displayedDay = routeDay
  const isPreviewDay = !days.some(({ day }) => day === displayedDay)
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

  useEffect(() => {
    if (days.some(({ day }) => day === routeDay) && selectedDay !== routeDay) {
      void selectDay(routeDay)
    }
  }, [days, routeDay, selectDay, selectedDay])

  const handleDaySelect = (day: number): void => {
    if (!days.some((item) => item.day === day)) {
      onRouteChange(day, 'study')
      return
    }
    onRouteChange(day, 'study')
    setDayData((current) => ({ ...current, error: null }))
    void selectDay(day)
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
    <div
      className={`min-h-dvh bg-toss-bg ${language === 'ja' ? 'theme-japanese' : ''}`}
      data-language-theme={language}
    >
      <Header
        language={language}
        day={displayedDay}
        category={isPreviewDay ? '학습 콘텐츠 준비 중' : `${selectedDayItem.category} · ${selectedDayItem.titleKo}`}
        completedStudy={isPreviewDay ? false : (progress.daySession?.completedStudy ?? false)}
        masteredCount={isPreviewDay ? 0 : progress.masteredCount}
        totalCount={isPreviewDay ? 30 : selectedDayItem.wordCount}
        onBackup={() => setIsBackupOpen(true)}
        onHome={onHome}
      />
      <main className="mx-auto grid w-full max-w-5xl gap-2 px-4 py-2 sm:gap-4 sm:px-6 sm:py-5 lg:grid-cols-[4.5rem_minmax(0,1fr)] lg:gap-8 lg:px-8">
        <aside className="min-w-0 lg:sticky lg:top-4 lg:h-0 lg:min-h-0 lg:self-start">
          <DaySelector
            days={days}
            selectedDay={displayedDay}
            completedDays={completedDays}
            pendingDay={pendingDay ?? dayData.loadingDay}
            errorMessage={selectionError ? userMessage(selectionError) : undefined}
            totalDays={100}
            onSelectDay={handleDaySelect}
          />
        </aside>
        <div className="flex min-w-0 flex-col gap-6">
          {isPreviewDay ? (
            <EmptyState
              title={`Day ${displayedDay} 준비 중이에요`}
              description="단어 데이터가 추가되면 이 자리에서 바로 학습할 수 있어요."
            />
          ) : null}
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
          {!isPreviewDay && isDayLoading ? (
            <motion.div
              key={`loading-day-${selectedDayItem.day}`}
              initial={{ opacity: 0, y: 10, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              <LoadingState message={`Day ${selectedDayItem.day} 카드를 준비하고 있어요.`} variant="card" />
            </motion.div>
          ) : null}
          {!isPreviewDay && !isDayLoading && words === undefined && dayError ? (
            <ErrorState message={userMessage(dayError)} onRetry={retrySelectedDay} />
          ) : null}
          {!isPreviewDay && words && progress.isLoading ? (
            <LoadingState message="저장된 학습 기록을 불러오고 있어요." delayMs={250} />
          ) : null}
          {!isPreviewDay && words && !progress.isLoading ? (
            <motion.div
              key={`loaded-day-${selectedDayItem.day}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              <AppTabs
                language={language}
                selectedTab={routeTab}
                onSelectTab={(tab) => onRouteChange(displayedDay, tab)}
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
                  <QuizCard key={`${selectedDayItem.day}-ko-to-en`} words={words} day={selectedDayItem.day} mode="ko-to-en" database={database} onNavigate={(tab) => onRouteChange(displayedDay, tab)} />
                ),
                'en-to-ko': (
                  <QuizCard key={`${selectedDayItem.day}-en-to-ko`} words={words} day={selectedDayItem.day} mode="en-to-ko" database={database} onNavigate={(tab) => onRouteChange(displayedDay, tab)} />
                ),
                incorrect: (
                  <IncorrectNote words={words} database={database} />
                ),
                }}
              />
            </motion.div>
          ) : null}
        </div>
      </main>
      {isBackupOpen ? <BackupModal database={database} getKnownWordIds={getKnownWordIds} onClose={() => setIsBackupOpen(false)} /> : null}
    </div>
  )
}

export default function App({ repository = wordRepository, database = db }: AppProps) {
  const [route, setRoute] = useState<AppRoute>(readRoute)
  const [retryCount, setRetryCount] = useState(0)
  const [indexState, setIndexState] = useState<IndexState & { language?: AppLanguageRoute }>({ days: null, error: null })
  const selectedLanguage = route.language
  const activeRepository = selectedLanguage === 'japanese' ? japaneseWordRepository : repository
  const activeDatabase = selectedLanguage === 'japanese' ? japaneseDb : database

  const navigate = useCallback((nextRoute: AppRoute, replace = false): void => {
    const hash = routeHash(nextRoute)
    if (replace) window.history.replaceState(null, '', hash)
    else window.history.pushState(null, '', hash)
    setRoute(nextRoute)
  }, [])

  useEffect(() => {
    const handleHistoryNavigation = (): void => setRoute(readRoute())
    window.addEventListener('popstate', handleHistoryNavigation)
    window.addEventListener('hashchange', handleHistoryNavigation)
    return () => {
      window.removeEventListener('popstate', handleHistoryNavigation)
      window.removeEventListener('hashchange', handleHistoryNavigation)
    }
  }, [])

  useEffect(() => {
    if (selectedLanguage === 'home') return
    let active = true
    void activeRepository
      .getDayIndex()
      .then((days) => {
        if (active) setIndexState({ days, error: null, language: selectedLanguage })
      })
      .catch((error: unknown) => {
        if (active) setIndexState({ days: null, error: toError(error), language: selectedLanguage })
      })
    return () => {
      active = false
    }
  }, [activeRepository, retryCount, selectedLanguage])

  if (selectedLanguage === 'home') {
    return <LandingPage onSelectEnglish={() => navigate({ language: 'english', day: 1, tab: 'study' })} onSelectJapanese={() => navigate({ language: 'japanese', day: 1, tab: 'study' })} />
  }

  const currentIndexState = indexState.language === selectedLanguage
    ? indexState
    : { days: null, error: null }

  if (currentIndexState.error) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <ErrorState
          title="Day 목록을 불러오지 못했어요"
          message={userMessage(currentIndexState.error)}
          onRetry={() => {
            activeRepository.clearCache()
            setIndexState({ days: null, error: null })
            setRetryCount((count) => count + 1)
          }}
        />
      </main>
    )
  }

  if (currentIndexState.days === null) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <LoadingState message="학습 Day 목록을 불러오고 있어요." />
      </main>
    )
  }

  if (currentIndexState.days.length === 0) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <EmptyState title="학습할 Day가 없어요" description="배포된 단어 데이터가 준비되면 여기에서 학습을 시작할 수 있어요." />
      </main>
    )
  }

  return (
    <LoadedApp
      days={currentIndexState.days}
      repository={activeRepository}
      database={activeDatabase}
      routeDay={route.day}
      routeTab={route.tab}
      onRouteChange={(day, tab) => navigate({ language: selectedLanguage, day, tab })}
      onHome={() => navigate({ language: 'home', day: 1, tab: 'study' })}
    />
  )
}
