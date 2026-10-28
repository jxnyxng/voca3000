import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { motion } from 'motion/react'
import type { VocaDatabase } from '../../db'
import { useCompletedDays } from '../../hooks/useCompletedDays'
import { useDaySelection } from '../../hooks/useDaySelection'
import { useDayWords } from '../../hooks/useDayWords'
import { useWordProgress } from '../../hooks/useWordProgress'
import type { WordRepository } from '../../services/wordRepository'
import type { AppTab } from '../../types/navigation'
import type { DayIndexItem, QuizMode } from '../../types/word'
import { builtinContentId } from '../../types/content'
import { userMessage } from '../../utils/userMessage'
import { EmptyState } from '../common/EmptyState'
import { ErrorState } from '../common/ErrorState'
import { Header } from '../common/Header'
import { LoadingState } from '../common/LoadingState'
import { DayLearningTabs } from '../day/DayLearningTabs'
import { DaySelector } from '../day/DaySelector'
import { WordListSheet } from '../study/WordListSheet'

export type AppWordRepository = Pick<
  WordRepository,
  'clearCache' | 'getDayIndex' | 'getWordsForDay'
>

interface LoadedAppProps {
  days: DayIndexItem[]
  repository: AppWordRepository
  database: VocaDatabase
  accountControl?: ReactNode
  onHome: () => void
  routeDay: number
  routeTab: AppTab
  onRouteChange: (day: number, tab: AppTab) => void
}

export function LoadedApp({ days, repository, database, accountControl, onHome, routeDay, routeTab, onRouteChange }: LoadedAppProps) {
  const language = days[0]?.language ?? 'en'
  const [isWordListOpen, setIsWordListOpen] = useState(false)
  const [direction, setDirection] = useState<QuizMode>('ko-to-en')
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
  const activeDirection = routeTab === 'ko-to-en' || routeTab === 'en-to-ko' ? routeTab : direction
  const isPreviewDay = !days.some(({ day }) => day === displayedDay)
  const words = wordsByDay.get(selectedDayItem.day)
  const contentId = builtinContentId(language, selectedDayItem.day)
  const wordIds = useMemo(() => words?.map(({ id }) => id) ?? [], [words])
  const progress = useWordProgress({ wordIds, contentId, database })
  const completedDays = useCompletedDays(database, language)

  useEffect(() => {
    void loadDay(selectedDayItem.day).catch(() => undefined)
  }, [loadDay, selectedDayItem.day])

  useEffect(() => {
    if (days.some(({ day }) => day === routeDay) && selectedDay !== routeDay) {
      void selectDay(routeDay)
    }
  }, [days, routeDay, selectDay, selectedDay])

  useEffect(() => {
    if (routeTab === 'ko-to-en' || routeTab === 'en-to-ko') setDirection(routeTab)
  }, [routeTab])

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

  const selectTab = (tab: AppTab): void => {
    if (tab === 'ko-to-en' || tab === 'en-to-ko') setDirection(tab)
    onRouteChange(displayedDay, tab)
  }

  const selectDirection = (nextDirection: QuizMode): void => {
    setDirection(nextDirection)
    if (routeTab === 'ko-to-en' || routeTab === 'en-to-ko') onRouteChange(displayedDay, nextDirection)
  }

  const dbError = progress.error ?? completedDays.error
  const dayError = selectionError ?? errorsByDay.get(selectedDayItem.day) ?? null
  const isDayLoading =
    words === undefined &&
    (loadingDays.has(selectedDayItem.day) || dayError === null)

  useEffect(() => {
    if (pendingScrollDayRef.current !== displayedDay || isDayLoading || words === undefined || progress.isLoading
      || tabsRef.current?.dataset.day !== String(displayedDay)) return
    tabsRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
    pendingScrollDayRef.current = null
  }, [displayedDay, isDayLoading, progress.isLoading, words])

  return (
    <div
      className={`min-h-dvh bg-toss-bg ${language === 'ja' ? 'theme-japanese' : ''}`}
      data-language-theme={language}
    >
      <Header
        language={language}
        day={displayedDay}
        category={isPreviewDay ? '학습 콘텐츠 준비 중' : `${selectedDayItem.category} · ${selectedDayItem.titleKo}`}
        masteredCount={isPreviewDay ? 0 : progress.masteredCount}
        totalCount={isPreviewDay ? 30 : selectedDayItem.wordCount}
        onHome={onHome}
        accountControl={accountControl}
        selectedTab={routeTab}
        onSelectTab={selectTab}
        direction={activeDirection}
        onSelectDirection={selectDirection}
      />
      <motion.main
        className="mx-auto grid w-full max-w-5xl gap-2 px-4 pb-1 pt-0 sm:gap-4 sm:px-6 sm:pb-2 lg:grid-cols-[4.5rem_minmax(0,1fr)] lg:gap-8 lg:px-8 lg:py-2 xl:grid-cols-[0_minmax(0,1fr)] xl:gap-0"
        animate={isWordListOpen ? { scale: 0.985 } : { scale: 1 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        <aside className="-mx-4 min-w-0 bg-toss-blue sm:-mx-6 lg:sticky lg:top-1/2 lg:mx-0 lg:mt-[calc(50dvh-4rem)] lg:h-0 lg:min-h-0 lg:self-start lg:bg-transparent xl:-ml-[72px] xl:w-[51px]">
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
            <LoadingState message={`Day ${selectedDayItem.day} 카드를 준비하고 있어요.`} variant="card" delayMs={250} />
          ) : null}
          {!isPreviewDay && !isDayLoading && words === undefined && dayError ? (
            <ErrorState message={userMessage(dayError)} onRetry={retrySelectedDay} />
          ) : null}
          {!isPreviewDay && words && progress.isLoading ? (
            <LoadingState message="저장된 학습 기록을 불러오고 있어요." delayMs={250} />
          ) : null}
          {!isPreviewDay && words && !progress.isLoading ? (
            <DayLearningTabs
              containerRef={tabsRef}
              language={language}
              words={words}
              day={selectedDayItem.day}
              contentId={contentId}
              selectedTab={routeTab}
              direction={activeDirection}
              database={database}
              progressByWordId={progress.progressByWordId}
              completedStudy={progress.daySession?.completedStudy ?? false}
              onSelectTab={selectTab}
              onNavigateToIncorrect={(direction) => {
                setDirection(direction)
                onRouteChange(displayedDay, 'incorrect')
              }}
              onToggleMastered={progress.toggleMastered}
              onToggleFavorite={progress.toggleFavorite}
              onStudyComplete={progress.markStudyCompleted}
              onOpenWordList={() => setIsWordListOpen(true)}
            />
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
    </div>
  )
}

