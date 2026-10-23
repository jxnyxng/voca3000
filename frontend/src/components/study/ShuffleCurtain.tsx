import { motion } from 'motion/react'
import type { ShufflePhase } from './useShuffleTransition'

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
      <span className="text-2xl font-extrabold tracking-tight text-toss-text sm:text-3xl">
        voca<span className="text-toss-blue">3000</span>
      </span>
    </motion.div>
  )
}
