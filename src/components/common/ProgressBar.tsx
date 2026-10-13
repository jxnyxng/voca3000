import { cn } from '../../utils/cn'

export interface ProgressBarProps {
  value: number
  max: number
  label: string
  showValue?: boolean
  className?: string
  compact?: boolean
}

export function ProgressBar({ value, max, label, showValue = true, className, compact = false }: ProgressBarProps) {
  const safeMax = Number.isFinite(max) && max > 0 ? max : 1
  const safeValue = Number.isFinite(value) ? Math.min(Math.max(value, 0), safeMax) : 0
  const percentage = (safeValue / safeMax) * 100

  return (
    <div className={cn('w-full', className)}>
      <div className={cn('flex items-center justify-between', compact ? 'mb-1 gap-1 text-[10px]' : 'mb-2 gap-3 text-sm')}>
        <span className="font-medium text-toss-text">{label}</span>
        {showValue ? <span className="shrink-0 text-toss-muted">{safeValue} / {safeMax}</span> : null}
      </div>
      <div
        className={cn('overflow-hidden rounded-full bg-toss-border', compact ? 'h-1.5' : 'h-2.5')}
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={safeValue}
        aria-valuetext={`${safeMax}개 중 ${safeValue}개 완료`}
      >
        <div
          className="h-full rounded-full bg-toss-blue transition-[width] duration-300 ease-toss motion-reduce:transition-none"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
