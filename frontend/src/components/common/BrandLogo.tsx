import { cn } from '../../utils/cn'

interface BrandLogoProps {
  className?: string
  compact?: boolean
  showMark?: boolean
}

export function BrandLogo({ className, compact = false, showMark = false }: BrandLogoProps) {
  return (
    <span className={cn('inline-flex items-center tracking-[-0.045em]', compact ? 'gap-1.5' : 'gap-2.5', className)}>
      {showMark ? (
        <span
          className={cn(
            'grid shrink-0 place-items-center rounded-[28%] bg-toss-blue font-black tracking-[-0.12em] text-white shadow-[0_5px_14px_rgba(27,100,218,0.24)]',
            compact ? 'size-7 pr-px text-sm' : 'size-10 pr-0.5 text-xl',
          )}
          aria-hidden="true"
        >
          득
        </span>
      ) : null}
      <span className="font-black text-toss-text">
        워드<span className="text-toss-blue">득</span>
      </span>
    </span>
  )
}
