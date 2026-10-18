import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { WordListSheet } from './components/study/WordListSheet'
import { db, japaneseDb, type VocaDatabase } from './db'
import { useDaySelection } from './hooks/useDaySelection'
import { useDayIndex } from './hooks/useDayIndex'
import { useDayWords } from './hooks/useDayWords'
import { useCompletedDays } from './hooks/useCompletedDays'
import { useHashRoute } from './hooks/useHashRoute'
import { useWordProgress } from './hooks/useWordProgress'
import {
  wordRepository,
  japaneseWordRepository,
  type WordRepository,
  WordRepositoryError,
} from './services/wordRepository'
import type { AppTab } from './types/navigation'
import type { DayIndexItem } from './types/word'

type AppWordRepository = Pick<
  WordRepository,
  'clearCache' | 'getDayIndex' | 'getWordsForDay'
>

export interface AppProps {
  repository?: AppWordRepository
  database?: VocaDatabase
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
  const [isWordListOpen, setIsWordListOpen] = useState(false)
  const pendingScrollDayRef = useRef<number | null>(null)
  const tabsRef = useRef<HTMLDivElement>(null)
  const {
    wordsByDay,
    loadingDays,
    errorsByDay,
    loadDay,
    retryDay,
  } = useDayWords(repository)
  const { selectedDay, pendingDay, selectionError, selectDay } = useDaySelection({
    days,
    prepareDay: loadDay,
  })
  const selectedDayItem = days.find(({ day }) => day === routeDay)
    ?? days.find(({ day }) => day === selectedDay)
    ?? days[0]!
  const displayedDay = routeDay
  const isPreviewDay = !days.some(({ day }) => day === displayedDay)
  const words = wordsByDay.get(selectedDayItem.day)
  const wordIds = useMemo(() => words?.map(({ id }) => id) ?? [], [words])
  const progress = useWordProgress({ wordIds, day: selectedDayItem.day, database })
  const completedDays = useCompletedDays(database)

  useEffect(() => {
    void loadDay(selectedDayItem.day).catch(() => undefined)
  }, [loadDay, selectedDayItem.day])

  useEffect(() => {
    if (days.some(({ day }) => day === routeDay) && selectedDay !== routeDay) {
      void selectDay(routeDay)
    }
  }, [days, routeDay, selectDay, selectedDay])

  const handleDaySelect = (day: number): void => {
    pendingScrollDayRef.current = day
    if (!days.some((item) => item.day === day)) {
      onRouteChange(day, routeTab)
      return
    }
    onRouteChange(day, routeTab)
    void selectDay(day)
  }

  const retrySelectedDay = (): void => {
    retryDay(selectedDayItem.day)
  }

  const dbError = progress.error ?? completedDays.error
  const dayError = selectionError ?? errorsByDay.get(selectedDayItem.day) ?? null
  const isDayLoading =
    words === undefined &&
    (loadingDays.has(selectedDayItem.day) || dayError === null)

  useEffect(() => {
    if (pendingScrollDayRef.current !== displayedDay || isDayLoading || words === undefined || progress.isLoading) return
    tabsRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
    pendingScrollDayRef.current = null
  }, [displayedDay, isDayLoading, progress.isLoading, words])

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
      <motion.main
        className="mx-auto grid w-full max-w-5xl gap-2 px-4 py-2 sm:gap-4 sm:px-6 sm:py-5 lg:grid-cols-[4.5rem_minmax(0,1fr)] lg:gap-8 lg:px-8"
        animate={isWordListOpen ? { scale: 0.985 } : { scale: 1 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        <aside className="min-w-0 lg:sticky lg:top-1/2 lg:mt-[calc(50dvh-4rem)] lg:h-0 lg:min-h-0 lg:self-start">
          <DaySelector
            days={days}
            selectedDay={displayedDay}
            completedDays={completedDays.days}
            pendingDay={pendingDay ?? (loadingDays.has(selectedDayItem.day) ? selectedDayItem.day : undefined)}
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
                completedDays.retry()
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
              ref={tabsRef}
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
                    onOpenWordList={() => setIsWordListOpen(true)}
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
      </motion.main>
      {words ? (
        <WordListSheet
          key={selectedDayItem.day}
          open={isWordListOpen}
          days={days}
          initialDay={selectedDayItem.day}
          initialWords={words}
          database={database}
          loadWords={(day) => repository.getWordsForDay(day)}
          onClose={() => setIsWordListOpen(false)}
        />
      ) : null}
      {isBackupOpen ? <BackupModal database={database} getKnownWordIds={getKnownWordIds} onClose={() => setIsBackupOpen(false)} /> : null}
    </div>
  )
}

export default function App({ repository = wordRepository, database = db }: AppProps) {
  const { route, navigate } = useHashRoute()
  const selectedLanguage = route.language
  const activeRepository = selectedLanguage === 'japanese' ? japaneseWordRepository : repository
  const activeDatabase = selectedLanguage === 'japanese' ? japaneseDb : database
  const index = useDayIndex(
    activeRepository,
    selectedLanguage === 'home' ? undefined : selectedLanguage,
  )

  if (selectedLanguage === 'home') {
    return <LandingPage onSelectEnglish={() => navigate({ language: 'english', day: 1, tab: 'study' })} onSelectJapanese={() => navigate({ language: 'japanese', day: 1, tab: 'study' })} />
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
      database={activeDatabase}
      routeDay={route.day}
      routeTab={route.tab}
      onRouteChange={(day, tab) => navigate({ language: selectedLanguage, day, tab })}
      onHome={() => navigate({ language: 'home', day: 1, tab: 'study' })}
    />
  )
}
