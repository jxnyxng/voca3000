import { AlertCircle } from 'lucide-react'
import { useId } from 'react'
import { cn } from '../../utils/cn'

export interface ErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
  className?: string
}

export function ErrorState({ title = '문제가 발생했어요', message, onRetry, className }: ErrorStateProps) {
  const titleId = useId()

  return (
    <section
      className={cn('flex min-h-56 flex-col items-center justify-center rounded-toss-card border border-toss-error/20 bg-toss-surface p-8 text-center shadow-toss', className)}
      role="alert"
      aria-labelledby={titleId}
    >
      <AlertCircle className="mb-4 size-9 text-toss-error" aria-hidden="true" />
      <h2 id={titleId} className="text-xl font-bold text-toss-text">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-toss-muted">{message}</p>
      {onRetry ? (
        <button
          type="button"
          className="mt-6 min-h-11 rounded-toss-button bg-toss-blue px-5 font-semibold text-white transition-colors hover:bg-toss-blue-hover motion-reduce:transition-none"
          onClick={onRetry}
        >
          다시 시도
        </button>
      ) : null}
    </section>
  )
}
