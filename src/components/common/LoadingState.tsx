import { LoaderCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '../../utils/cn'

export interface LoadingStateProps {
  message?: string
  className?: string
  delayMs?: number
}

export function LoadingState({ message = '학습 데이터를 불러오고 있어요.', className, delayMs = 0 }: LoadingStateProps) {
  const [delayElapsed, setDelayElapsed] = useState(false)

  useEffect(() => {
    if (delayMs === 0) return
    const timer = window.setTimeout(() => setDelayElapsed(true), delayMs)
    return () => window.clearTimeout(timer)
  }, [delayMs])

  if (delayMs > 0 && !delayElapsed) return null

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
