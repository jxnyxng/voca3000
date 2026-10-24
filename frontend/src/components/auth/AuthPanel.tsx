import { useState } from 'react'
import type { AuthState } from '../../types/auth'

export interface AuthPanelProps {
  enabled: boolean
  state: AuthState
  pending: boolean
  onLogout: () => Promise<boolean>
  onDeleteAccount: () => Promise<boolean>
}

export function AuthPanel({ enabled, state, pending, onLogout, onDeleteAccount }: AuthPanelProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  if (!enabled) return null
  if (state.status === 'loading') {
    return <span className="text-xs font-semibold text-toss-muted" role="status">로그인 확인 중</span>
  }
  if (state.status === 'anonymous') {
    return (
      <div className="flex flex-wrap items-center justify-end gap-2">
        {state.error && <span className="text-xs text-toss-muted" role="alert">{state.error}</span>}
        <a className="rounded-full bg-toss-blue px-4 py-2 text-sm font-bold text-white" href="/oauth2/authorization/google">
          Google로 로그인
        </a>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <span className="text-sm font-semibold text-toss-text">{state.user.displayName}</span>
      {state.error && <span className="text-xs text-red-600" role="alert">{state.error}</span>}
      <button type="button" className="rounded-full px-3 py-2 text-sm font-semibold text-toss-muted" disabled={pending} onClick={() => void onLogout()}>
        로그아웃
      </button>
      {confirmingDelete ? (
        <span className="flex items-center gap-1 rounded-full bg-red-50 p-1 pl-3 text-xs text-red-700">
          서버 계정을 삭제할까요?
          <button type="button" className="rounded-full bg-red-600 px-3 py-1.5 font-bold text-white" disabled={pending} onClick={() => void onDeleteAccount().then((deleted) => { if (deleted) setConfirmingDelete(false) })}>삭제</button>
          <button type="button" className="rounded-full px-2 py-1.5 font-bold" disabled={pending} onClick={() => setConfirmingDelete(false)}>취소</button>
        </span>
      ) : (
        <button type="button" className="rounded-full px-3 py-2 text-xs font-semibold text-red-600" disabled={pending} onClick={() => setConfirmingDelete(true)}>
          회원 탈퇴
        </button>
      )}
    </div>
  )
}
