import { ArrowLeft, CheckCircle2, Mail, ShieldCheck, UserRound } from 'lucide-react'
import { useState } from 'react'
import type { AuthUser } from '../../types/auth'
import { BrandLogo } from '../common/BrandLogo'
import { ProfileAvatar } from './ProfileAvatar'

interface ProfilePageProps {
  user: AuthUser
  pending: boolean
  onBack: () => void
  onDeleteAccount: () => Promise<boolean>
}

export function ProfilePage({ user, pending, onBack, onDeleteAccount }: ProfilePageProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  return (
    <main className="min-h-dvh bg-toss-bg px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-2xl">
        <header className="flex items-center justify-between">
          <button type="button" className="text-xl" aria-label="워드득 홈" onClick={onBack}>
            <BrandLogo showMark />
          </button>
          <button
            type="button"
            className="inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-sm font-semibold text-toss-muted transition-colors hover:bg-toss-surface hover:text-toss-text motion-reduce:transition-none"
            onClick={onBack}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            돌아가기
          </button>
        </header>

        <section className="mt-10 overflow-hidden rounded-toss-card bg-toss-surface shadow-toss-float" aria-labelledby="profile-title">
          <div className="flex items-center gap-4 border-b border-toss-border px-5 py-6 sm:px-8 sm:py-8">
            <ProfileAvatar imageUrl={user.profileImageUrl} name={user.displayName} className="size-16 sm:size-20" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-toss-blue">내 정보</p>
              <h1 id="profile-title" className="mt-1 truncate text-2xl font-extrabold tracking-tight text-toss-text">{user.displayName}</h1>
              <p className="mt-1 text-sm text-toss-muted">Google 계정으로 로그인했어요.</p>
            </div>
          </div>

          <dl className="grid gap-1 p-3 sm:p-5">
            <InfoRow icon={<UserRound />} label="이름" value={user.displayName} />
            <InfoRow icon={<Mail />} label="이메일" value={user.email} />
            <InfoRow icon={<ShieldCheck />} label="회원 유형" value={user.membershipTier === 'PREMIUM' ? 'PREMIUM' : 'FREE'} />
            <InfoRow icon={<CheckCircle2 />} label="학습 기록" value="이 기기와 서버에 자동 저장" />
          </dl>

          <div className="border-t border-toss-border px-5 py-5 sm:px-8">
            {confirmingDelete ? (
              <div className="rounded-2xl bg-red-50/80 p-4">
                <p className="text-sm font-semibold text-red-700">계정과 서버에 저장된 학습 기록을 모두 삭제할까요?</p>
                <p className="mt-1 text-xs leading-5 text-red-600/80">삭제한 계정은 복구할 수 없어요.</p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    disabled={pending}
                    className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                    onClick={() => void onDeleteAccount().then((deleted) => { if (!deleted) setConfirmingDelete(false) })}
                  >
                    {pending ? '삭제 중…' : '계정 삭제'}
                  </button>
                  <button type="button" disabled={pending} className="rounded-lg px-3 py-2 text-xs font-semibold text-toss-muted hover:bg-white" onClick={() => setConfirmingDelete(false)}>취소</button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="text-xs font-medium text-toss-muted/70 underline-offset-4 transition-colors hover:text-red-600 hover:underline"
                onClick={() => setConfirmingDelete(true)}
              >
                회원 탈퇴
              </button>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}

function InfoRow({ icon, label, value }: { icon: React.ReactElement; label: string; value: string }) {
  return (
    <div className="grid grid-cols-[2.5rem_minmax(0,1fr)] items-center rounded-2xl px-3 py-3 transition-colors hover:bg-toss-bg sm:grid-cols-[2.5rem_8rem_minmax(0,1fr)]">
      <span className="grid size-9 place-items-center rounded-xl bg-toss-bg text-toss-muted [&>svg]:size-4" aria-hidden="true">{icon}</span>
      <dt className="text-xs font-semibold text-toss-muted sm:text-sm">{label}</dt>
      <dd className="col-start-2 min-w-0 break-words text-sm font-semibold text-toss-text sm:col-start-3">{value}</dd>
    </div>
  )
}
