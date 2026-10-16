import { useId } from 'react'
import { cn } from '../../utils/cn'
import { SlidingPillIndicator } from './SlidingPillIndicator'

export interface SegmentedControlOption<Value extends string> {
  value: Value
  label: string
  ariaLabel?: string
}

export interface SegmentedControlProps<Value extends string> {
  value: Value
  options: readonly SegmentedControlOption<Value>[]
  ariaLabel: string
  onChange: (value: Value) => void
}

export function SegmentedControl<Value extends string>({
  value,
  options,
  ariaLabel,
  onChange,
}: SegmentedControlProps<Value>) {
  const indicatorId = `${useId()}-segmented-indicator`

  return (
    <div
      className="inline-flex rounded-full border border-toss-border bg-toss-surface p-0.5 shadow-sm"
      role="group"
      aria-label={ariaLabel}
    >
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            className={cn(
              'relative isolate min-h-7 min-w-10 rounded-full px-2 text-[0.6875rem] font-semibold transition-colors motion-reduce:transition-none',
              selected ? 'text-white' : 'text-toss-muted',
            )}
            aria-label={option.ariaLabel}
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
          >
            {selected ? (
              <SlidingPillIndicator layoutId={indicatorId} className="bg-toss-blue shadow-sm" />
            ) : null}
            <span className="relative z-10" aria-hidden={option.ariaLabel === undefined ? undefined : true}>
              {option.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
