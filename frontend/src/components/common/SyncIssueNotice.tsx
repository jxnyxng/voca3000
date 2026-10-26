import { CloudAlert, RefreshCw } from 'lucide-react'
import type { LearningSyncIssue } from '../../hooks/useLearningSync'

interface SyncIssueNoticeProps {
  issue: LearningSyncIssue | null
  onRetry: () => void
}

export function SyncIssueNotice({ issue, onRetry }: SyncIssueNoticeProps) {
  if (issue === null) return null

  const authRequired = issue === 'auth-required'
  const message = authRequired
    ? '로그인이 만료되어 학습 기록이 이 기기에만 저장되고 있어요.'
    : issue === 'offline'
      ? '인터넷 연결을 확인해 주세요. 학습 기록은 이 기기에 안전하게 보관 중이에요.'
      : '서버 저장이 지연되고 있어요. 학습 기록은 이 기기에 안전하게 보관 중이에요.'

  return (
    <aside
      className="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-xl items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950 shadow-toss-float sm:bottom-5"
      role="alert"
    >
      <CloudAlert className="size-5 shrink-0 text-amber-600" aria-hidden="true" />
      <p className="min-w-0 flex-1 text-xs font-medium leading-5 sm:text-sm">{message}</p>
      {authRequired ? (
        <a className="shrink-0 rounded-lg bg-amber-600 px-3 py-2 text-xs font-bold text-white hover:bg-amber-700" href="/oauth2/authorization/google">
          다시 로그인
        </a>
      ) : (
        <button type="button" className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-2 text-xs font-bold text-amber-800 hover:bg-amber-100" onClick={onRetry}>
          <RefreshCw className="size-3.5" aria-hidden="true" />
          다시 시도
        </button>
      )}
    </aside>
  )
}
