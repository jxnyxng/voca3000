import { AnimatePresence, motion } from 'motion/react'
import { ChevronDown, LogOut, UserRound } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { AuthState } from '../../types/auth'
import { ProfileAvatar } from './ProfileAvatar'

export interface AuthPanelProps {
  enabled: boolean
  state: AuthState
  pending: boolean
  compact?: boolean
  onOpenProfile: () => void
  onLogout: () => Promise<boolean>
}

export function AuthPanel({ enabled, state, pending, compact = false, onOpenProfile, onLogout }: AuthPanelProps) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return undefined
    const closeOnOutside = (event: PointerEvent): void => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  if (!enabled) return null
  if (state.status === 'loading') {
    return <span className="text-xs font-semibold text-toss-muted" role="status">로그인 확인 중</span>
  }
  if (state.status === 'anonymous') {
    return (
      <div className="flex flex-wrap items-center justify-end gap-2">
        {state.error && <span className="text-xs text-toss-muted" role="alert">{state.error}</span>}
        <a className={`rounded-full bg-toss-blue font-bold text-white transition-colors hover:bg-toss-blue-hover ${compact ? 'px-3 py-2 text-xs' : 'px-4 py-2 text-sm'}`} href="/oauth2/authorization/google">
          Google로 로그인
        </a>
      </div>
    )
  }

  return (
    <div ref={menuRef} className="relative flex items-center justify-end">
      {state.error ? <span className="mr-2 text-xs text-toss-error" role="alert">{state.error}</span> : null}
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        className={`group inline-flex max-w-48 items-center rounded-full bg-toss-surface font-bold text-toss-text shadow-sm ring-1 ring-inset ring-toss-border transition-[background-color,box-shadow,transform] hover:bg-white hover:shadow-toss active:scale-[0.98] motion-reduce:transition-none ${compact ? 'gap-1.5 py-1 pl-1 pr-1.5 text-xs' : 'gap-2 py-1.5 pl-1.5 pr-2 text-sm'}`}
        onClick={() => setOpen((current) => !current)}
      >
        <ProfileAvatar imageUrl={state.user.profileImageUrl} name={state.user.displayName} className={compact ? 'size-7' : 'size-9'} />
        <span className="min-w-0 truncate">{state.user.displayName}</span>
        <ChevronDown className={`size-4 shrink-0 text-toss-muted transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            role="menu"
            aria-label="사용자 메뉴"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 top-full z-30 mt-2 w-44 origin-top-right overflow-hidden rounded-2xl border border-toss-border/80 bg-toss-surface p-1.5 shadow-toss-float"
          >
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-toss-text transition-colors hover:bg-toss-bg focus:bg-toss-bg motion-reduce:transition-none"
              onClick={() => { setOpen(false); onOpenProfile() }}
            >
              <UserRound className="size-4 text-toss-muted" aria-hidden="true" />
              내 정보 보기
            </button>
            <div className="mx-2 my-1 h-px bg-toss-border" />
            <button
              type="button"
              role="menuitem"
              disabled={pending}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-toss-muted transition-colors hover:bg-toss-bg hover:text-toss-text focus:bg-toss-bg disabled:opacity-50 motion-reduce:transition-none"
              onClick={() => { setOpen(false); void onLogout() }}
            >
              <LogOut className="size-4" aria-hidden="true" />
              로그아웃
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
