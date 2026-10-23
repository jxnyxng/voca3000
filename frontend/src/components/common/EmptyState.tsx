import { BookOpen } from 'lucide-react'
import { useId } from 'react'
import { cn } from '../../utils/cn'

export interface EmptyStateProps {
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  className?: string
}

export function EmptyState({ title, description, actionLabel, onAction, className }: EmptyStateProps) {
  const hasAction = actionLabel !== undefined && onAction !== undefined
  const titleId = useId()

  return (
    <section
      className={cn('flex min-h-56 flex-col items-center justify-center rounded-toss-card bg-toss-surface p-8 text-center shadow-toss', className)}
      aria-labelledby={titleId}
    >
      <span className="mb-4 grid size-12 place-items-center rounded-full bg-toss-ice-blue text-toss-blue">
        <BookOpen className="size-6" aria-hidden="true" />
      </span>
      <h2 id={titleId} className="text-xl font-bold text-toss-text">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-toss-muted">{description}</p>
      {hasAction ? (
        <button
          type="button"
          className="mt-6 min-h-11 rounded-toss-button bg-toss-blue px-5 font-semibold text-white transition-colors hover:bg-toss-blue-hover motion-reduce:transition-none"
          onClick={onAction}
        >
          {actionLabel}
        </button>
      ) : null}
    </section>
  )
}
