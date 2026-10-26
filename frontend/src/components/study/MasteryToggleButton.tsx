import { useReducedMotion } from 'motion/react'
import { cn } from '../../utils/cn'
import { MasteryStatusIcon } from './MasteryStatusIcon'

export interface MasteryToggleButtonProps {
  mastered: boolean
  pending: boolean
  size?: 'list' | 'card'
  className?: string
  onToggle: () => void
  onMasteredAnimationComplete?: () => void
}

export function MasteryToggleButton({
  mastered,
  pending,
  size = 'list',
  className,
  onToggle,
  onMasteredAnimationComplete,
}: MasteryToggleButtonProps) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <button
      type="button"
      aria-label={mastered ? '외웠어요' : '외우는 중'}
      aria-pressed={mastered}
      disabled={pending}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full transition-all disabled:cursor-default disabled:opacity-50 motion-reduce:transition-none',
        size === 'card' ? 'size-12' : 'size-6',
        className,
        mastered
          ? 'bg-toss-success/10 text-toss-success ring-1 ring-inset ring-toss-success/15 hover:bg-toss-success/20 hover:text-toss-success hover:ring-toss-success/25'
          : 'bg-toss-surface text-toss-muted ring-1 ring-inset ring-toss-border hover:bg-toss-bg hover:text-toss-muted hover:ring-toss-muted/30',
      )}
      onClick={onToggle}
    >
      <MasteryStatusIcon
        mastered={mastered}
        pending={pending}
        reduceMotion={shouldReduceMotion ?? false}
        className={size === 'card' ? 'size-5' : 'size-4'}
        onMasteredAnimationComplete={onMasteredAnimationComplete}
      />
    </button>
  )
}
