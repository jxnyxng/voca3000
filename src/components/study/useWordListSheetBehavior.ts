import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  PointerEvent as ReactPointerEvent,
  TouchEvent as ReactTouchEvent,
  WheelEvent as ReactWheelEvent,
} from 'react'
import { useDragControls, useReducedMotion } from 'motion/react'

export function useWordListSheetBehavior(open: boolean, closeSheet: () => void) {
  const shouldReduceMotion = useReducedMotion()
  const dragControls = useDragControls()
  const [listPullClosing, setListPullClosing] = useState(false)
  const wheelPullRef = useRef({ distance: 0, lastAt: 0 })
  const touchPullRef = useRef<{ startY: number, startedAtTop: boolean } | null>(null)
  const listPullClosingRef = useRef(false)

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') closeSheet()
    }
    document.addEventListener('keydown', handleKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [closeSheet, open])

  const closeFromListPull = useCallback((): void => {
    if (listPullClosingRef.current) return
    listPullClosingRef.current = true
    setListPullClosing(true)
    window.requestAnimationFrame(closeSheet)
  }, [closeSheet])

  const startSheetDrag = (event: ReactPointerEvent): void => {
    if (!shouldReduceMotion) dragControls.start(event)
  }

  const handleListWheel = (event: ReactWheelEvent<HTMLDivElement>): void => {
    if (window.innerWidth >= 1024) return
    if (event.currentTarget.scrollTop > 0 || event.deltaY >= 0) {
      wheelPullRef.current = { distance: 0, lastAt: 0 }
      return
    }

    const now = Date.now()
    const previous = wheelPullRef.current
    const distance = now - previous.lastAt > 350 ? -event.deltaY : previous.distance - event.deltaY
    wheelPullRef.current = { distance, lastAt: now }
    if (distance >= 120) {
      wheelPullRef.current = { distance: 0, lastAt: 0 }
      closeFromListPull()
    }
  }

  const handleListTouchStart = (event: ReactTouchEvent<HTMLDivElement>): void => {
    if (window.innerWidth >= 1024) return
    const touch = event.touches[0]
    if (!touch) return
    touchPullRef.current = {
      startY: touch.clientY,
      startedAtTop: event.currentTarget.scrollTop === 0,
    }
  }

  const handleListTouchMove = (event: ReactTouchEvent<HTMLDivElement>): void => {
    const pull = touchPullRef.current
    const touch = event.touches[0]
    if (!pull || !touch || !pull.startedAtTop) return
    if (touch.clientY - pull.startY >= 90) {
      touchPullRef.current = null
      closeFromListPull()
    }
  }

  const finishListPull = (): void => {
    touchPullRef.current = null
  }

  const finishExit = (): void => {
    setListPullClosing(false)
    listPullClosingRef.current = false
  }

  return {
    shouldReduceMotion,
    dragControls,
    listPullClosing,
    startSheetDrag,
    handleListWheel,
    handleListTouchStart,
    handleListTouchMove,
    finishListPull,
    finishExit,
  }
}
