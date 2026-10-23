import { RotateCcw, Volume2, VolumeX } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { EmptyState } from '../common/EmptyState'
import { ErrorState } from '../common/ErrorState'
import { LoadingState } from '../common/LoadingState'
import { SegmentedControl } from '../common/SegmentedControl'
import { db, getIncorrectProgress, type VocaDatabase } from '../../db'
import { useSpeech } from '../../hooks/useSpeech'
import type { IncorrectProgressFilter, UserProgressRecord } from '../../types/progress'
import type { WordItem } from '../../types/word'
import { builtinContentId, type LearningContentId } from '../../types/content'

const FILTERS: readonly IncorrectProgressFilter[] = ['all', 'ko-to-en', 'en-to-ko']

interface IncorrectSnapshot {
  queryKey: string
  records: UserProgressRecord[]
  error: Error | null
}

export interface IncorrectNoteProps {
  words: readonly WordItem[]
  database?: VocaDatabase
  contentId?: LearningContentId
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error('Incorrect progress query failed.', { cause: error })
}

export function IncorrectNote({
  words,
  contentId = builtinContentId(words[0]?.language ?? 'en', words[0]?.day ?? 1),
  database = db,
}: IncorrectNoteProps) {
  const [filter, setFilter] = useState<IncorrectProgressFilter>('all')
  const [retryCount, setRetryCount] = useState(0)
  const [speakingWordId, setSpeakingWordId] = useState<string | null>(null)
  const isJapanese = words[0]?.language === 'ja'
  const targetShort = isJapanese ? '일' : '영'
  const filterLabel = (value: IncorrectProgressFilter): string => {
    if (value === 'ko-to-en') return `한→${targetShort}`
    if (value === 'en-to-ko') return `${targetShort}→한`
    return '전체'
  }
  const speech = useSpeech(isJapanese ? 'ja-JP' : 'en-US')
  const wordIdsKey = words.map(({ id }) => id).join('\u0000')
  const queryKey = `${wordIdsKey}:${retryCount}`
  const snapshot = useLiveQuery<IncorrectSnapshot>(
    async () => {
      try {
        const records = await getIncorrectProgress(contentId, 'all', database)
        return { queryKey, records, error: null }
      } catch (error) {
        return { queryKey, records: [], error: toError(error) }
      }
    },
    [contentId, database, queryKey],
  )
  const isCurrentSnapshot = snapshot?.queryKey === queryKey
  const recordsByWordId = useMemo(() => {
    if (!isCurrentSnapshot) return new Map<string, UserProgressRecord>()
    const filteredRecords = snapshot.records.filter((record) => {
      if (filter === 'ko-to-en') return record.lastResultKoToEn === 'incorrect'
      if (filter === 'en-to-ko') return record.lastResultEnToKo === 'incorrect'
      return true
    })
    return new Map(filteredRecords.map((record) => [record.wordId, record]))
  }, [filter, isCurrentSnapshot, snapshot])
  const items = words.flatMap((word) => {
    const progress = recordsByWordId.get(word.id)
    return progress ? [{ word, progress }] : []
  })

  return (
    <section className="min-w-0 max-w-full" aria-labelledby="incorrect-note-title">
      <div className="mb-4 flex min-h-9 flex-wrap items-center justify-between gap-3">
        <h2 id="incorrect-note-title" className="sr-only">오답노트</h2>
        <p className="text-sm font-semibold text-toss-text" aria-live="polite">
          {items.length} / {words.length}
          <span className="ml-2 font-normal text-toss-muted">최근 오답</span>
        </p>
        <SegmentedControl
          value={filter}
          ariaLabel="오답 방향 필터"
          options={FILTERS.map((value) => ({ value, label: filterLabel(value) }))}
          onChange={setFilter}
        />
      </div>

      {!isCurrentSnapshot ? <LoadingState message="오답 기록을 불러오고 있어요." delayMs={250} /> : null}
      {isCurrentSnapshot && snapshot.error ? (
        <ErrorState message="오답 기록을 불러오지 못했어요. 다시 시도해 주세요." onRetry={() => setRetryCount((count) => count + 1)} />
      ) : null}
      {isCurrentSnapshot && !snapshot.error && items.length === 0 ? (
        <EmptyState title="최근 오답이 없어요" description="잘하고 있어요! 퀴즈에서 틀린 문제가 생기면 여기에 표시돼요." />
      ) : null}
      {isCurrentSnapshot && !snapshot.error && items.length > 0 ? (
        <>
          {!speech.isSupported ? <p className="mb-3 text-sm text-toss-muted">이 브라우저는 음성 재생을 지원하지 않아요.</p> : null}
          {speech.error ? <p className="mb-3 text-sm text-toss-error" role="alert">{speech.error}</p> : null}
          <ul className="grid min-w-0 max-w-full gap-4 md:grid-cols-2">
            {items.map(({ word, progress }) => {
              const isThisPlaying = speech.isPlaying && speakingWordId === word.id
              const incorrectCount = progress.incorrectCountKoToEn + progress.incorrectCountEnToKo
              return (
                <li key={word.id} className="min-w-0 max-w-full rounded-toss-card bg-toss-surface p-5 shadow-toss">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xl font-extrabold text-toss-text">{word.word}</p>
                      <p className="mt-1 text-sm text-toss-muted">{isJapanese ? `(${word.pronunciation})` : word.pronunciation}</p>
                    </div>
                    <button
                      type="button"
                      className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-toss-button border border-toss-border px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label={isThisPlaying ? `${word.word} 발음 중지` : `${word.word} 발음 듣기`}
                      disabled={!speech.isSupported}
                      onClick={() => {
                        if (isThisPlaying) {
                          speech.stop()
                          setSpeakingWordId(null)
                        } else {
                          setSpeakingWordId(word.id)
                          speech.speak(word.word)
                        }
                      }}
                    >
                      {isThisPlaying ? <VolumeX className="size-4" aria-hidden="true" /> : <Volume2 className="size-4" aria-hidden="true" />}
                      {isThisPlaying ? '중지' : '발음'}
                    </button>
                  </div>

                  <p className="mt-4 font-bold text-toss-text">{word.meaning}</p>
                  <p className="mt-4 leading-7 text-toss-text">{word.exampleEn}</p>
                  {isJapanese && word.examplePronunciation ? (
                    <p className="mt-1 text-sm leading-6 text-toss-muted">({word.examplePronunciation})</p>
                  ) : null}
                  <p className="mt-1 leading-7 text-toss-muted">→ {word.exampleKo}</p>

                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold">
                    {progress.lastResultKoToEn === 'incorrect' ? <span className="rounded-full bg-toss-error/10 px-3 py-1 text-toss-error">최근 오답 · 한→{targetShort}</span> : null}
                    {progress.lastResultEnToKo === 'incorrect' ? <span className="rounded-full bg-toss-error/10 px-3 py-1 text-toss-error">최근 오답 · {targetShort}→한</span> : null}
                    <span className="inline-flex items-center gap-1 rounded-full bg-toss-bg px-3 py-1 text-toss-muted">
                      <RotateCcw className="size-3" aria-hidden="true" />
                      누적 오답 {incorrectCount}회
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      ) : null}
    </section>
  )
}
