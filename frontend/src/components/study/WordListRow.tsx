import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import type { WordItem } from '../../types/word'
import { cn } from '../../utils/cn'
import { MasteryToggleButton } from './MasteryToggleButton'

export interface WordListRowProps {
  word: WordItem
  day: number
  position: number
  showDay: boolean
  mastered: boolean
  masteryPending: boolean
  exampleExpanded: boolean
  onToggleMastery: () => void
  onToggleExample: () => void
}

export function WordListRow({
  word,
  day,
  position,
  showDay,
  mastered,
  masteryPending,
  exampleExpanded,
  onToggleMastery,
  onToggleExample,
}: WordListRowProps) {
  const shouldReduceMotion = useReducedMotion()
  const exampleId = `word-list-example-${word.id}`

  return (
    <li
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-toss-border px-3 py-3 transition-colors sm:px-4',
        exampleExpanded ? 'bg-toss-ice-blue/30' : 'bg-toss-bg/70 hover:bg-toss-border/35',
      )}
    >
      <button
        type="button"
        aria-label={`${word.word} 예문 ${exampleExpanded ? '숨기기' : '보기'}`}
        aria-expanded={exampleExpanded}
        aria-controls={exampleId}
        className="absolute inset-0 z-0 rounded-2xl"
        onClick={onToggleExample}
      />
      <div className="pointer-events-none relative z-10 grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(5.5rem,0.55fr)] items-center gap-x-3 lg:grid-cols-[minmax(0,1fr)_minmax(7rem,0.6fr)]">
        <div data-word-line className="flex min-w-0 items-start gap-2 lg:items-center">
          <span className="inline-flex min-w-5 shrink-0 items-center justify-center rounded-md bg-toss-surface px-1 py-0.5 text-[0.625rem] font-bold text-toss-muted shadow-sm">
            {showDay ? `Day ${String(day).padStart(2, '0')} · ${position}` : position}
          </span>
          <div className="flex min-w-0 flex-1 flex-col items-start gap-0.5 lg:flex-row lg:items-center lg:gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <p className="min-w-0 truncate font-extrabold text-toss-text">{word.word}</p>
              <MasteryToggleButton
                mastered={mastered}
                pending={masteryPending}
                className="pointer-events-auto"
                onToggle={onToggleMastery}
              />
            </div>
            <p className="min-w-0 truncate text-xs text-toss-muted/75">({word.pronunciation})</p>
          </div>
        </div>
        <div className="col-start-2 row-start-1 flex min-w-0 justify-end">
          <p data-meaning-mastery-line className="min-w-0 text-right text-sm font-semibold text-toss-blue">{word.meaning}</p>
        </div>
        <AnimatePresence initial={false}>
          {exampleExpanded ? (
            <motion.div
              id={exampleId}
              data-example-line
              className="col-span-2 row-start-2 min-w-0 overflow-hidden"
              initial={shouldReduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
              animate={shouldReduceMotion ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
              transition={{ duration: shouldReduceMotion ? 0.01 : 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="pt-2">
                <div className="rounded-xl bg-toss-surface px-3 py-2.5 ring-1 ring-inset ring-toss-border/70">
                  <p className="text-sm font-medium leading-6 text-toss-text">{word.exampleEn}</p>
                  {word.examplePronunciation ? (
                    <p data-example-pronunciation className="mt-0.5 text-xs leading-5 text-toss-muted">({word.examplePronunciation})</p>
                  ) : null}
                  <p className="mt-1 text-xs leading-5 text-toss-muted">{word.exampleKo}</p>
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </li>
  )
}
