import { LoaderCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '../../utils/cn'

export interface LoadingStateProps {
  message?: string
  className?: string
  delayMs?: number
  variant?: 'default' | 'card'
}

export function LoadingState({ message = '학습 데이터를 불러오고 있어요.', className, delayMs = 0, variant = 'default' }: LoadingStateProps) {
  const [delayElapsed, setDelayElapsed] = useState(false)

  useEffect(() => {
    if (delayMs === 0) return
    const timer = window.setTimeout(() => setDelayElapsed(true), delayMs)
    return () => window.clearTimeout(timer)
  }, [delayMs])

  if (delayMs > 0 && !delayElapsed) return null

  if (variant === 'card') {
    return (
      <div
        className={cn('relative flex min-h-80 flex-col items-center justify-center overflow-hidden rounded-toss-card bg-toss-surface p-8 text-center shadow-toss lg:min-h-[28rem]', className)}
        role="status"
        aria-live="polite"
      >
        <div className="absolute inset-0 animate-pulse p-6 motion-reduce:animate-none sm:p-8" aria-hidden="true">
          <div className="h-6 w-14 rounded-full bg-toss-border/70" />
          <div className="mx-auto mt-12 h-9 w-2/5 rounded-lg bg-toss-border/70" />
          <div className="mx-auto mt-3 h-4 w-1/3 rounded bg-toss-border/50" />
          <div className="mt-10 h-20 rounded-toss-button bg-toss-bg" />
          <div className="mx-auto mt-7 h-4 w-12 rounded bg-toss-border/50" />
          <div className="mx-auto mt-3 h-5 w-3/4 rounded bg-toss-border/60" />
        </div>
        <div className="relative z-10 mt-auto inline-flex items-center gap-2 rounded-full bg-toss-surface/95 px-4 py-2 shadow-sm">
          <LoaderCircle className="size-5 animate-spin text-toss-blue motion-reduce:animate-none" aria-hidden="true" />
          <p className="text-sm font-medium text-toss-text">{message}</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn('flex min-h-56 flex-col items-center justify-center gap-3 rounded-toss-card bg-toss-surface p-8 text-center shadow-toss', className)}
      role="status"
      aria-live="polite"
    >
      <LoaderCircle className="size-7 animate-spin text-toss-blue motion-reduce:animate-none" aria-hidden="true" />
      <p className="font-medium text-toss-text">{message}</p>
    </div>
  )
}
