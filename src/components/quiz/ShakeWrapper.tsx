import { motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'

interface ShakeWrapperProps {
  children: ReactNode
  shake: boolean
  className?: string
}

export function ShakeWrapper({ children, shake, className }: ShakeWrapperProps) {
  const reduceMotion = useReducedMotion()

  return (
    <motion.div
      className={className}
      animate={shake && !reduceMotion ? { x: [-10, 10, -8, 8, -4, 4, 0] } : { x: 0 }}
      transition={{ duration: shake && !reduceMotion ? 0.4 : 0 }}
    >
      {children}
    </motion.div>
  )
}
