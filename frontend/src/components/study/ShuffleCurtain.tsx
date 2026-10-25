import { motion } from 'motion/react'
import type { ShufflePhase } from './useShuffleTransition'
import { BrandLogo } from '../common/BrandLogo'

export interface ShuffleCurtainProps {
  phase: ShufflePhase
  reduceMotion: boolean
  onAnimationComplete: () => void
}

export function ShuffleCurtain({ phase, reduceMotion, onAnimationComplete }: ShuffleCurtainProps) {
  return (
    <motion.div
      className="pointer-events-none absolute inset-0 z-20 grid place-items-center bg-toss-bg"
      initial={false}
      animate={{
        clipPath: phase === 'covering' || phase === 'holding'
          ? 'inset(0 0% 0 0)'
          : phase === 'revealing'
            ? 'inset(0 0 0 100%)'
            : 'inset(0 100% 0 0)',
      }}
      transition={{
        duration: phase === 'idle' ? 0 : reduceMotion ? 0.08 : 0.48,
        ease: [0.65, 0, 0.35, 1],
      }}
      onAnimationComplete={onAnimationComplete}
      aria-hidden="true"
    >
      <BrandLogo className="text-2xl sm:text-3xl" showMark />
    </motion.div>
  )
}
