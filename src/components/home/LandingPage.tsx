import { ArrowRight, BookOpen, Languages } from 'lucide-react'

export interface LandingPageProps {
  onSelectEnglish: () => void
}

export function LandingPage({ onSelectEnglish }: LandingPageProps) {
  return (
    <main className="min-h-screen bg-toss-bg px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-5xl flex-col sm:min-h-[calc(100vh-5rem)]">
        <header className="flex items-center justify-between">
          <p className="text-xl font-extrabold tracking-tight text-toss-text">
            voca<span className="text-toss-blue">3000</span>
          </p>
          <span className="rounded-full bg-toss-ice-blue px-3 py-1.5 text-xs font-bold text-toss-blue">
            하루 30개
          </span>
        </header>

        <section className="flex flex-1 items-center py-10" aria-labelledby="landing-title">
          <div className="grid w-full gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-toss-surface px-3 py-2 text-sm font-semibold text-toss-blue shadow-toss">
                <BookOpen className="size-4" aria-hidden="true" />
                매일 조금씩, 오래 기억하도록
              </span>
              <h1 id="landing-title" className="mt-6 max-w-xl text-4xl font-extrabold leading-tight tracking-tight text-toss-text sm:text-5xl">
                배우고, 풀어보고,
                <br />내 단어로 만들어요
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-toss-muted sm:text-lg sm:leading-8">
                하루 30개의 표현을 카드로 익히고 양방향 퀴즈와 오답노트로 반복하세요.
                학습 기록은 이 브라우저에 안전하게 저장됩니다.
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
                  className="group flex min-h-20 items-center gap-4 rounded-toss-button bg-toss-blue px-5 text-left text-white transition-colors hover:bg-toss-blue-hover motion-reduce:transition-none"
                  onClick={onSelectEnglish}
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/15 text-lg font-extrabold" aria-hidden="true">EN</span>
                  <span className="min-w-0 flex-1">
                    <strong className="block text-base">영어 공부하기</strong>
                    <span className="mt-0.5 block text-sm text-white/80">Day 01부터 학습을 시작해요</span>
                  </span>
                  <ArrowRight className="size-5 shrink-0 transition-transform group-hover:translate-x-1 motion-reduce:transition-none" aria-hidden="true" />
                </button>

                <button
                  type="button"
                  className="flex min-h-20 cursor-not-allowed items-center gap-4 rounded-toss-button border border-toss-border bg-toss-bg px-5 text-left text-toss-muted"
                  disabled
                  aria-describedby="japanese-status"
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-toss-surface text-lg font-extrabold" aria-hidden="true">JP</span>
                  <span className="min-w-0 flex-1">
                    <strong className="block text-base text-toss-text">일본어 공부하기</strong>
                    <span id="japanese-status" className="mt-0.5 block text-sm">학습 콘텐츠 준비 중이에요</span>
                  </span>
                  <Languages className="size-5 shrink-0" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
