import { useCallback, useEffect, useRef, useState } from 'react'

export type ShufflePhase = 'idle' | 'covering' | 'holding' | 'revealing'

export function useShuffleTransition(onCovered: () => void, reduceMotion: boolean) {
  const [phase, setPhase] = useState<ShufflePhase>('idle')
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onCoveredRef = useRef(onCovered)

  useEffect(() => {
    onCoveredRef.current = onCovered
  }, [onCovered])

  const start = useCallback(() => {
    setPhase((current) => current === 'idle' ? 'covering' : current)
  }, [])

  const handleAnimationComplete = useCallback(() => {
    if (phase === 'covering') {
      onCoveredRef.current()
      setPhase('holding')
      holdTimerRef.current = setTimeout(() => {
        setPhase('revealing')
        holdTimerRef.current = null
      }, reduceMotion ? 0 : 220)
    } else if (phase === 'revealing') {
      setPhase('idle')
    }
  }, [phase, reduceMotion])

  useEffect(() => () => {
    if (holdTimerRef.current !== null) clearTimeout(holdTimerRef.current)
  }, [])

  return {
    phase,
    isShuffling: phase !== 'idle',
    start,
    handleAnimationComplete,
  }
}
