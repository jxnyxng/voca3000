import { motion } from 'motion/react'
import { useId } from 'react'

export interface MasteryStatusIconProps {
  mastered: boolean
  pending?: boolean
  reduceMotion?: boolean
  className?: string
  onMasteredAnimationComplete?: () => void
}

export function MasteryStatusIcon({
  mastered,
  pending = false,
  reduceMotion = false,
  className = 'size-4',
  onMasteredAnimationComplete,
}: MasteryStatusIconProps) {
  const instantDuration = reduceMotion ? 0.01 : undefined
  const revealMaskId = `mastery-ring-${useId().replaceAll(':', '')}`

  return (
    <svg viewBox="0 0 24 24" className={`${className} overflow-visible`} fill="none" aria-hidden="true">
      <defs>
        <mask id={revealMaskId} maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
          <motion.circle
            cx="12"
            cy="12"
            r="7.5"
            stroke="white"
            strokeWidth="4.25"
            strokeLinecap={mastered ? 'round' : 'butt'}
            pathLength="1"
            initial={false}
            animate={mastered
              ? { pathLength: 0, pathOffset: 0.92, opacity: 0 }
              : { pathLength: 1, pathOffset: 0, opacity: 1 }}
            transition={reduceMotion
              ? { duration: instantDuration }
              : mastered
                ? { duration: 0.43, ease: [0.4, 0, 0.2, 1] }
                : {
                    pathLength: { duration: 0.55, delay: 0.18, ease: [0.16, 1, 0.3, 1] },
                    pathOffset: { duration: 0 },
                    opacity: { duration: 0.12, delay: 0.18 },
                  }}
          />
        </mask>
      </defs>
      <motion.g
        initial={false}
        animate={mastered
          ? { rotate: 210 }
          : { rotate: pending ? 360 : 0 }}
        transition={reduceMotion
          ? { duration: instantDuration }
          : mastered
            ? { duration: 0.43, ease: [0.4, 0, 0.2, 1] }
            : pending
              ? { rotate: { duration: 1.05, ease: 'linear', repeat: Infinity } }
              : { rotate: { duration: 0 } }}
        style={{ transformOrigin: '12px 12px' }}
      >
        <circle
          cx="12"
          cy="12"
          r="7.5"
          stroke="currentColor"
          strokeWidth="2.75"
          strokeLinecap="round"
          strokeDasharray="35.34 11.78"
          transform="rotate(180 12 12)"
          mask={`url(#${revealMaskId})`}
        />
      </motion.g>
      <motion.path
        d="M5.5 12.5 10 17 18.5 7.5"
        stroke="currentColor"
        strokeWidth="2.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={false}
        animate={mastered
          ? { pathLength: 1, opacity: 1 }
          : { pathLength: 0, opacity: 0 }}
        transition={reduceMotion
          ? { duration: instantDuration }
          : mastered
            ? { pathLength: { duration: 0.3, delay: 0.43, ease: [0.16, 1, 0.3, 1] }, opacity: { duration: 0.08, delay: 0.41 } }
            : { pathLength: { duration: 0.3, ease: 'easeOut' }, opacity: { duration: 0.18, delay: 0.08 } }}
        onAnimationComplete={() => {
          if (mastered) onMasteredAnimationComplete?.()
        }}
      />
    </svg>
  )
}
