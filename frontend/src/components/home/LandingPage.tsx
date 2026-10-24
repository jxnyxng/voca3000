import { ArrowRight, BookOpen, FileText } from 'lucide-react'
import { AuthPanel, type AuthPanelProps } from '../auth/AuthPanel'

function UnitedStatesFlag() {
  return (
    <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-black/5" aria-hidden="true" data-language-flag="us">
      <span className="text-2xl leading-none">🇺🇸</span>
    </span>
  )
}

function JapanFlag() {
  return (
    <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-black/5" aria-hidden="true" data-language-flag="jp">
      <span className="text-2xl leading-none">🇯🇵</span>
    </span>
  )
}

export interface LandingPageProps {
  onSelectEnglish: () => void
  onSelectJapanese: () => void
  auth: AuthPanelProps
}

export function LandingPage({ onSelectEnglish, onSelectJapanese, auth }: LandingPageProps) {
  return (
    <main className="min-h-screen bg-toss-bg px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-5xl flex-col sm:min-h-[calc(100vh-5rem)]">
        <header className="flex items-center justify-between">
          <p className="text-xl font-extrabold tracking-tight text-toss-text">
            voca<span className="text-toss-blue">3000</span>
          </p>
          <AuthPanel {...auth} />
        </header>

        <section className="flex flex-1 items-center py-10" aria-labelledby="landing-title">
          <div className="grid w-full gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-toss-surface px-3 py-2 text-sm font-semibold text-toss-blue shadow-toss">
                <BookOpen className="size-4" aria-hidden="true" />
                자주 쓰는 회화 표현
              </span>
              <h1 id="landing-title" className="mt-6 max-w-xl text-4xl font-extrabold leading-tight tracking-tight text-toss-text sm:text-5xl">
                회화 단어,
                <br />하루 30개씩
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-toss-muted sm:text-lg sm:leading-8">
                카드로 익히고 퀴즈로 바로 확인하세요.
              </p>
              <p className="mt-3 max-w-xl text-sm font-medium text-toss-muted">
                {auth.state.status === 'authenticated'
                  ? `${auth.state.user.membershipTier === 'PREMIUM' ? 'PREMIUM' : '무료'} 회원은 Day ${auth.state.user.membershipTier === 'PREMIUM' ? '100' : '50'}까지 학습할 수 있어요.`
                  : '비회원은 Day 3까지 체험할 수 있어요. Google 로그인하면 Day 50까지 열려요.'}
              </p>
            </div>

            <div className="rounded-toss-card bg-toss-surface p-5 shadow-toss-float sm:p-7">
              <div className="mb-5">
                <h2 className="text-xl font-extrabold text-toss-text">어떤 언어를 공부할까요?</h2>
                <p className="mt-1 text-sm text-toss-muted">학습할 언어를 선택해 주세요.</p>
              </div>
              <div className="grid gap-3">
                <button
                  type="button"
                  className="group flex min-h-20 items-center gap-4 rounded-toss-button border border-toss-border bg-toss-surface px-5 text-left text-toss-text transition-colors hover:bg-toss-bg motion-reduce:transition-none"
                  onClick={onSelectEnglish}
                >
                  <UnitedStatesFlag />
                  <span className="min-w-0 flex-1">
                    <strong className="block text-base text-toss-text">영어 공부하기</strong>
                  </span>
                  <ArrowRight className="size-5 shrink-0 transition-transform group-hover:translate-x-1 motion-reduce:transition-none" aria-hidden="true" />
                </button>

                <button
                  type="button"
                  disabled
                  className="flex min-h-20 cursor-not-allowed items-center gap-4 rounded-toss-button border border-toss-border bg-toss-bg px-5 text-left opacity-70"
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-500 shadow-sm ring-1 ring-violet-100" aria-hidden="true">
                    <FileText className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <strong className="block text-base text-toss-text">내 텍스트로 공부하기</strong>
                      <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-bold text-violet-600">준비 중</span>
                    </span>
                    <span className="mt-0.5 block text-sm text-toss-muted">문맥에 맞는 뜻과 회화 단어를 분석할 예정이에요</span>
                  </span>
                </button>

                <button
                  type="button"
                  className="group flex min-h-20 items-center gap-4 rounded-toss-button border border-toss-border bg-toss-surface px-5 text-left text-toss-text transition-colors hover:bg-toss-bg motion-reduce:transition-none"
                  onClick={onSelectJapanese}
                >
                  <JapanFlag />
                  <span className="min-w-0 flex-1">
                    <strong className="block text-base text-toss-text">일본어 공부하기</strong>
                  </span>
                  <ArrowRight className="size-5 shrink-0 transition-transform group-hover:translate-x-1 motion-reduce:transition-none" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
