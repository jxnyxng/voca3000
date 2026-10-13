import { motion } from 'motion/react'
import { cn } from '../../utils/cn'

export interface SlidingPillIndicatorProps {
  layoutId: string
  className?: string
}

export function SlidingPillIndicator({ layoutId, className }: SlidingPillIndicatorProps) {
  return (
    <motion.span
      layoutId={layoutId}
      className={cn('absolute inset-0 z-0 rounded-full', className)}
      transition={{ type: 'spring', stiffness: 500, damping: 40 }}
      aria-hidden="true"
      data-pill-indicator=""
    />
  )
}
