# voca3000 최종 제품 기획서 및 실행 명세

> 문서 버전: 3.0.0  
> 상태: 구현 승인 대기 / 구현 착수 가능  
> 기준일: 2026-10-11  
> 저장소: `https://github.com/jxnyxng/voca3000.git`  
> 대상 구현 환경: CLI 기반 자율 코딩 에이전트  
> 언어: 사용자 UI 및 문서 기본 언어는 한국어

---

## 0. 문서의 목적과 우선순위

이 문서는 `voca3000`을 처음부터 구현하고 검증·배포하기 위한 단일 기준 문서다. 구현자는 이 문서만으로 구조, 데이터 계약, 사용자 흐름, 예외 처리, 테스트 및 완료 조건을 판단할 수 있어야 한다.

요구사항이 충돌할 경우 다음 우선순위를 따른다.

1. 데이터 유실 방지와 사용자 안전
2. 이 문서의 명시적 인수 조건
3. 접근성과 키보드 사용성
4. 정확한 학습 및 채점 동작
5. 시각적 완성도와 애니메이션

명세에 없는 기능을 임의로 추가하지 않는다. 구현 중 제품 의미가 달라지는 결정이 필요하면 먼저 문서를 수정한 뒤 구현한다.

---

## 1. 제품 개요

### 1.1 제품 정의

`voca3000`은 영어 단어와 숙어 3,000개를 하루 30개씩 100일 동안 학습하도록 설계된 브라우저 기반 단어 학습 SPA다. 서버 계정 없이 동작하며, 학습 진도와 퀴즈 기록은 사용자의 브라우저 IndexedDB에 저장한다.

### 1.2 핵심 가치

- 하루 30개라는 명확하고 부담이 낮은 학습 단위
- 영어 가리기와 한국어 가리기를 모두 지원하는 능동 회상 학습
- 한→영 및 영→한 타이핑 퀴즈
- 오답을 즉시 확인하고 다시 학습할 수 있는 흐름
- 로그인 없이 로컬에서 빠르게 사용
- JSON 파일을 통한 사용자의 직접적인 백업과 복원

### 1.3 목표 사용자

- B1~C1 수준의 실생활 영어 어휘를 확장하려는 한국어 사용자
- 출퇴근·통학 중 모바일 또는 데스크톱 브라우저로 짧게 학습하려는 사용자
- 계정 가입이나 서버 동기화 없이 개인 학습 기록을 관리하려는 사용자

### 1.4 범위 구분

#### 1차 구현 범위(MVP)

- 100일 데이터 구조와 UI를 지원하는 앱 엔진
- 검수 완료된 Day 01 단어 30개
- 학습, 한→영 퀴즈, 영→한 퀴즈, 오답노트
- 진도 및 점수의 IndexedDB 저장
- JSON 백업 및 덮어쓰기 복원
- 반응형 UI, 키보드 접근성, 모션 감축
- 단위·컴포넌트·DB 통합 테스트
- GitHub Pages 자동 배포

#### 최종 콘텐츠 목표

- Day 01~100, 하루 30개, 총 3,000개의 검수된 데이터
- 모든 Day 파일이 준비되기 전에는 존재하지 않는 Day를 선택 가능 상태로 표시하지 않는다.
- `words-index.json`에는 실제 배포된 Day만 등록한다.

#### 명시적 비범위

- 회원가입, 로그인, 서버 데이터베이스
- 기기 간 자동 동기화
- 결제, 구독, 광고
- AI가 런타임에서 단어 또는 예문을 생성하는 기능
- 소셜 랭킹, 친구, 커뮤니티
- 음성 인식 채점
- 네이티브 모바일 앱

---

## 2. 확정 기술 스택과 호환성 정책

| 구분 | 확정안 | 정책 |
| --- | --- | --- |
| Node.js | 22.12 이상 | Node 22 LTS 계열 사용 |
| 패키지 관리자 | npm | `package-lock.json`을 커밋하고 CI는 `npm ci` 사용 |
| UI | React 19.x + TypeScript | Strict Mode 유지 |
| 빌드 | Vite 8.x | 최소 8.3 계열, 생성 시 지원 중인 8.x 확인 |
| 스타일 | Tailwind CSS 4.x + `@tailwindcss/vite` | CSS `@theme` 기반 토큰 |
| 로컬 DB | Dexie 4.x + `dexie-react-hooks` | 모든 앱 DB 변경은 Dexie API로 수행 |
| 애니메이션 | Motion for React (`motion`) | import 경로는 `motion/react` |
| 아이콘 | `lucide-react` | 아이콘 단독 버튼에는 접근 가능한 이름 필수 |
| 클래스 유틸 | `clsx`, `tailwind-merge` | `cn()`으로 통합 |
| 축하 효과 | `canvas-confetti` | 모션 감축 사용자는 실행하지 않음 |
| 테스트 | Vitest + React Testing Library + jsdom | Node 22.12 이상 |
| IndexedDB 테스트 | `fake-indexeddb` | 테스트 setup에서 자동 등록 |
| 배포 | GitHub Pages + GitHub Actions | `main` 성공 빌드만 배포 |
| TTS | Web Speech API | 지원하지 않는 브라우저에서는 기능 비활성화 |

### 2.1 버전 정책

- `package.json`에는 구현일에 호환성이 확인된 버전 범위를 기록한다.
- 최초 구현 후 생성된 `package-lock.json`이 재현 가능한 설치의 최종 기준이다.
- `latest`는 최초 템플릿 생성에만 사용할 수 있으며, 생성 직후 Vite 8.x 및 React 19.x인지 확인한다.
- 주요 버전 자동 업그레이드는 금지한다.
- 보안 또는 주요 버전 업그레이드는 별도 브랜치에서 빌드와 전체 테스트를 통과한 뒤 반영한다.

### 2.2 지원 브라우저

- Vite 8 기본 프로덕션 브라우저 타깃을 따른다.
- 최신 안정 버전 Chrome, Edge, Firefox, Safari를 우선 지원한다.
- iOS Safari와 Android Chrome의 모바일 레이아웃을 검증한다.
- IndexedDB 또는 Web Speech API 미지원 환경은 앱 전체 실패가 아닌 기능별 안내 상태로 처리한다.

---

## 3. 안전한 초기 스캐폴딩 절차

현재 루트에는 `.git`, `README.md`, `.gitignore`, 이 문서가 존재한다. 이 파일들은 보존한다.

### 3.1 사전 검사

```bash
node --version
npm --version
git status --short
git remote -v
test ! -e temp-init
```

- Node가 22.12 미만이면 중단한다.
- `temp-init`이 이미 존재하면 삭제하지 말고 중단하여 사용자의 파일인지 확인한다.
- 기존 파일을 무조건 덮어쓰지 않는다.

### 3.2 템플릿 생성 및 필요한 파일 복사

```bash
npm create vite@latest temp-init -- --template react-ts
```

생성된 `temp-init/package.json`에서 React 19.x와 Vite 8.x를 확인한 다음 아래 대상을 루트로 옮긴다.

- `src/`
- `public/`
- `index.html`
- `package.json`
- `tsconfig.json` 및 템플릿이 생성한 모든 `tsconfig.*.json`
- `vite.config.ts`
- `eslint.config.js` 또는 템플릿이 생성한 동등한 ESLint 설정

기존 루트의 다음 파일은 유지한다.

- `.git/`
- `.gitignore`
- `README.md`
- `PROJECT_SPEC.md`

복사가 성공하고 루트 파일을 확인한 뒤에만 정확히 `temp-init` 디렉터리를 제거한다. 삭제 전 `pwd`와 대상 경로를 확인한다.

### 3.3 의존성

```bash
npm install dexie dexie-react-hooks motion lucide-react clsx tailwind-merge canvas-confetti
npm install -D @types/canvas-confetti tailwindcss @tailwindcss/vite vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event fake-indexeddb @types/node
```

Vite 템플릿이 제공하는 React, TypeScript, ESLint 및 React 플러그인은 유지한다.

### 3.4 필수 npm scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "test": "vitest",
    "test:run": "vitest run",
    "preview": "vite preview"
  }
}
```

### 3.5 `.gitignore` 필수 항목

```gitignore
node_modules/
dist/
coverage/
.vitest/
temp-init/
.env
.env.*
!.env.example
.DS_Store
*.log
```

---

## 4. 프로젝트 디렉터리 구조

```text
voca3000/
├── .github/
│   └── workflows/
│       └── deploy-pages.yml
├── public/
│   └── data/
│       ├── words-index.json
│       └── words-day01.json
├── src/
│   ├── components/
│   │   ├── common/
│   │   │   ├── AppErrorBoundary.tsx
│   │   │   ├── BackupModal.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── LoadingState.tsx
│   │   │   └── ProgressBar.tsx
│   │   ├── day/
│   │   │   └── DaySelector.tsx
│   │   ├── quiz/
│   │   │   ├── QuizCard.tsx
│   │   │   ├── QuizScore.tsx
│   │   │   └── ShakeWrapper.tsx
│   │   └── study/
│   │       ├── FlashCard.tsx
│   │       └── StudyDeck.tsx
│   ├── constants/
│   │   └── app.ts
│   ├── db/
│   │   └── index.ts
│   ├── hooks/
│   │   ├── useQuizSession.ts
│   │   ├── useSpeech.ts
│   │   └── useWordProgress.ts
│   ├── services/
│   │   └── wordRepository.ts
│   ├── test/
│   │   ├── db.test.ts
│   │   ├── setup.ts
│   │   └── textMatcher.test.ts
│   ├── types/
│   │   ├── backup.ts
│   │   └── word.ts
│   ├── utils/
│   │   ├── backup.ts
│   │   ├── cn.ts
│   │   ├── textMatcher.ts
│   │   └── validators.ts
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── .gitignore
├── eslint.config.js
├── index.html
├── package-lock.json
├── package.json
├── PROJECT_SPEC.md
├── README.md
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
```

실제 템플릿에서 TypeScript 설정 파일명이 달라지면 템플릿 구조를 따르되 역할은 동일하게 유지한다.

---

## 5. 빌드, 테스트 및 Tailwind 설정

### 5.1 `vite.config.ts`

```typescript
/// <reference types="vitest/config" />

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    clearMocks: true,
    restoreMocks: true,
  },
});
```

`base: './'`은 라우터가 없는 단일 엔트리 SPA와 GitHub Pages 프로젝트 경로를 함께 지원하기 위한 결정이다. 정적 데이터 URL을 `/data/...`처럼 루트 절대경로로 작성해서는 안 된다.

### 5.2 데이터 URL 규칙

```typescript
const dataUrl = `${import.meta.env.BASE_URL}data/words-index.json`;
```

모든 public 정적 데이터 fetch는 `import.meta.env.BASE_URL`을 사용한다.

### 5.3 테스트 setup

```typescript
import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
```

### 5.4 Tailwind 토큰

`src/index.css`:

```css
@import "tailwindcss";

@theme {
  --color-toss-blue: #3182f6;
  --color-toss-blue-hover: #1b64da;
  --color-toss-ice-blue: #e8f3ff;
  --color-toss-bg: #f9fafb;
  --color-toss-surface: #ffffff;
  --color-toss-text: #191f28;
  --color-toss-muted: #8b95a1;
  --color-toss-border: #e5e8eb;
  --color-toss-success: #20c997;
  --color-toss-error: #f04452;

  --radius-toss-card: 20px;
  --radius-toss-button: 14px;

  --shadow-toss: 0 2px 12px rgb(0 0 0 / 4%);
  --shadow-toss-float: 0 8px 24px rgb(0 0 0 / 8%);

  --ease-toss: cubic-bezier(0.16, 1, 0.3, 1);
}

@layer base {
  :root {
    color-scheme: light;
    font-synthesis: none;
  }

  * {
    box-sizing: border-box;
  }

  body {
    min-width: 320px;
    min-height: 100vh;
    margin: 0;
    background: var(--color-toss-bg);
    color: var(--color-toss-text);
    font-family: -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo",
      "Pretendard Variable", Pretendard, sans-serif;
    -webkit-font-smoothing: antialiased;
    word-break: keep-all;
  }

  button,
  input {
    font: inherit;
  }

  :focus-visible {
    outline: 3px solid color-mix(in srgb, var(--color-toss-blue) 40%, transparent);
    outline-offset: 2px;
  }
}
```

Pretendard가 설치되어 있지 않은 환경에서도 시스템 폰트로 정상 표시되어야 한다. 외부 폰트 CDN은 MVP 필수 사항이 아니다.

---

## 6. 데이터 계약

### 6.1 공통 타입

```typescript
export type CategoryType =
  | 'Daily Life'
  | 'Leisure & Hobbies'
  | 'Interpersonal & Emotions'
  | 'Work & Campus'
  | 'Troubleshooting'
  | 'Fluency Booster';

export type QuizMode = 'ko-to-en' | 'en-to-ko';

export interface WordItem {
  id: string;
  day: number;
  category: CategoryType;
  word: string;
  meaning: string;
  pronunciation: string;
  partOfSpeech: 'verb' | 'noun' | 'adjective' | 'adverb' | 'phrase';
  exampleEn: string;
  exampleKo: string;
  acceptableAnswersKo: string[];
  acceptableAnswersEn: string[];
}

export interface DayIndexItem {
  day: number;
  category: CategoryType;
  titleKo: string;
  wordCount: number;
  dataVersion: string;
  filePath: string;
}
```

### 6.2 단어 데이터 규칙

- ID 형식은 `w0001`부터 `w3000`까지이며 전체 데이터셋에서 유일해야 한다.
- Day 범위는 1~100이고 각 완성된 Day에는 정확히 30개가 있어야 한다.
- 한 Day 안의 모든 단어는 해당 Day 인덱스의 category와 일치해야 한다.
- `word`, `meaning`, `exampleEn`, `exampleKo`는 빈 문자열일 수 없다.
- `acceptableAnswersKo`와 `acceptableAnswersEn`에는 대표 답안을 중복해서 넣지 않아도 되지만, 넣어도 로딩 시 Set으로 중복 제거한다.
- 정규화했을 때 빈 문자열이 되는 허용 답안은 유효하지 않다.
- 동일한 정규화 결과의 답안은 중복으로 간주한다.
- 영어 숙어의 필수 전치사와 목적어 형태를 데이터에서 명확히 지정한다.
- 예문은 해당 표제어 또는 허용 가능한 활용형을 실제로 포함해야 한다.
- 예문과 번역은 직접 작성하거나 사용 권한이 확인된 콘텐츠만 사용한다.
- 발음기호는 IPA 표기를 기본으로 하며, 데이터 전반에서 미국식 또는 영국식 기준을 일관되게 유지한다. MVP는 미국식 영어를 기본으로 한다.

### 6.3 Day 인덱스 규칙

`public/data/words-index.json`에는 실제로 존재하고 검증을 통과한 Day만 포함한다.

```json
[
  {
    "day": 1,
    "category": "Daily Life",
    "titleKo": "일상과 루틴",
    "wordCount": 30,
    "dataVersion": "1.0.0",
    "filePath": "data/words-day01.json"
  }
]
```

- `filePath`는 선행 슬래시가 없는 BASE_URL 상대경로다.
- Day 항목은 day 오름차순으로 정렬한다.
- 중복 Day가 없어야 한다.
- `wordCount`와 실제 JSON 항목 수가 일치해야 한다.
- 파일 로드 또는 검증 실패 시 해당 Day 학습을 시작하지 않고 재시도 가능한 오류 화면을 표시한다.

### 6.4 Day 01 콘텐츠 범위

- 카테고리: `Daily Life`
- 한국어 제목: `일상과 루틴`
- 수준: B1~C1 혼합
- 단어 수: 정확히 30개
- 기존 샘플 `commute`, `errand`, `cluttered`, `tidy up`, `groceries`를 포함할 수 있으나 최종 30개 전체에 대해 중복·품사·IPA·예문·번역·허용 답안을 검수한다.
- 단어 데이터는 코드와 분리된 정적 JSON으로 유지한다.

### 6.5 데이터 로더

`wordRepository.ts`는 다음 책임만 가진다.

- BASE_URL 기반 인덱스 fetch
- 선택한 Day JSON fetch
- HTTP 상태 확인
- JSON 구조의 런타임 검증
- Day, category, 개수 및 ID 무결성 검증
- 성공 시 `WordItem[]` 반환
- 사용자 표시용 오류와 개발자 진단용 오류를 구분

데이터 로딩 결과를 IndexedDB에 중복 저장하지 않는다. 정적 단어는 배포 파일이 원본이며 IndexedDB에는 사용자 상태만 저장한다.

---

## 7. IndexedDB 스키마 및 도메인 규칙

### 7.1 사용자 진도 타입

```typescript
export interface UserProgressRecord {
  wordId: string;
  isMastered: boolean;
  correctCountKoToEn: number;
  incorrectCountKoToEn: number;
  correctCountEnToKo: number;
  incorrectCountEnToKo: number;
  lastResultKoToEn?: 'correct' | 'incorrect';
  lastResultEnToKo?: 'correct' | 'incorrect';
  lastStudiedAt: string;
}

export interface DaySessionSummary {
  day: number;
  completedStudy: boolean;
  koToEnHighScore: number;
  enToKoHighScore: number;
  lastAttemptAtKoToEn?: string;
  lastAttemptAtEnToKo?: string;
}
```

### 7.2 스키마

```typescript
export class VocaDatabase extends Dexie {
  progress!: Table<UserProgressRecord, string>;
  daySessions!: Table<DaySessionSummary, number>;

  constructor() {
    super('Voca3000DB');
    this.version(1).stores({
      progress:
        'wordId, isMastered, lastResultKoToEn, lastResultEnToKo, lastStudiedAt',
      daySessions:
        'day, completedStudy, koToEnHighScore, enToKoHighScore',
    });
  }
}
```

숫자 카운트는 조회 인덱스가 필요하지 않으므로 기본 스키마 인덱스에서 제외한다. 향후 스키마가 바뀌면 기존 `version(1)`을 수정하지 말고 `version(2)`와 마이그레이션을 추가한다.

### 7.3 필수 DB 함수

- `toggleMastered(wordId)`
- `recordQuizResult(wordId, mode, isCorrect)`
- `markStudyCompleted(day)`
- `updateQuizHighScore(day, mode, score)`
- `getProgressForWords(wordIds)`
- `getIncorrectProgress(mode | 'all')`
- `exportUserData()`
- `restoreUserData(jsonString)`
- 테스트 전용 DB 삭제/초기화 보조 함수

### 7.4 트랜잭션 및 검증 규칙

- 읽기 후 쓰기가 이어지는 변경은 `rw` 트랜잭션에서 수행한다.
- 카운트는 항상 0 이상의 정수다.
- `day`는 1~100 정수만 허용한다.
- 점수는 0~100 사이의 유한한 수이며 본 앱에서는 정수로 저장한다.
- 날짜는 `new Date().toISOString()` 형식으로 저장한다.
- 알 수 없는 `mode`는 조용히 무시하지 않고 오류를 발생시킨다.
- 한 문제는 한 퀴즈 세션에서 최초 확정 제출 한 번만 `recordQuizResult`에 반영한다.
- 오답 후 확인 화면에서 Enter를 여러 번 눌러도 카운트가 중복 증가하지 않아야 한다.

### 7.5 학습 완료 기준

- 사용자가 해당 Day의 30개 카드를 모두 한 번 이상 열람하면 `completedStudy`를 `true`로 기록한다.
- 열람은 카드가 뷰포트에 보인 것만으로 판단하지 않고, StudyDeck에서 해당 카드로 명시적으로 이동하거나 그리드 항목을 펼친 경우로 판단한다.
- 한 번 완료된 상태는 재학습 시작으로 자동 해제하지 않는다.

### 7.6 오답노트 기준

- 기본 오답노트에는 두 퀴즈 모드 중 하나라도 `lastResult... === 'incorrect'`인 단어가 표시된다.
- 사용자가 같은 모드에서 이후 정답을 맞히면 그 모드의 `lastResult`가 `correct`로 바뀐다.
- 두 모드 모두 최근 결과가 `correct`이거나 기록이 없으면 기본 오답노트에서 제외한다.
- 누적 오답 횟수는 이력 통계로 유지되며 최근 정답을 맞혀도 감소시키지 않는다.
- 사용자는 오답노트에서 한영, 영한, 전체 필터를 선택할 수 있다.

### 7.7 암기 완료와 퀴즈 결과의 관계

- `isMastered`는 사용자가 학습 카드에서 직접 토글하는 자기평가 값이다.
- 퀴즈 정답 또는 오답이 `isMastered`를 자동으로 변경하지 않는다.
- 두 개념을 UI에서 혼동하지 않도록 각각 “외웠어요”와 “최근 퀴즈 결과”로 표현한다.

---

## 8. 문자열 정규화 및 채점 엔진

### 8.1 기본 원칙

- 부분 문자열 일치는 허용하지 않는다.
- 사용자 입력과 모든 허용 답안을 동일한 규칙으로 정규화한 뒤 Set 완전 일치로 판정한다.
- 빈 입력이나 정규화 후 빈 문자열은 항상 오답이다.
- 데이터에 명시하지 않은 동의어를 런타임에서 추측하지 않는다.

### 8.2 한국어 정규화

```typescript
export function normalizeKorean(text: string): string {
  if (!text) return '';

  return text
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[~!?.,;:'"`()\[\]{}·…\s]/g, '');
}
```

### 8.3 영어 정규화

```typescript
export function normalizeEnglish(text: string): string {
  if (!text) return '';

  return text
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z0-9'\s-]/g, '')
    .replace(/\s+/g, ' ');
}
```

영어에서 apostrophe는 `don't`와 같은 표기를 보존하기 위해 허용한다. 하이픈과 apostrophe의 생략을 허용하려면 허용 답안 배열에 두 형태를 모두 명시한다.

### 8.4 한국어 `하다` 보조 규칙

- 완전 일치를 먼저 검사한다.
- 완전 일치가 실패한 경우에만 사용자 입력과 허용 답안 양쪽 끝의 `하다`를 제거해 비교한다.
- 제거 후 결과가 두 글자 미만이면 보조 비교를 수행하지 않는다.
- `되다`, `시키다`, 조사 제거 등은 자동 추론하지 않고 필요한 형태를 허용 답안에 명시한다.

### 8.5 정답 집합 생성

- 한→영: `word` + `acceptableAnswersEn`
- 영→한: `meaning` + `acceptableAnswersKo`
- 정규화 결과가 빈 항목은 제거한다.
- 정규화한 Set이 비면 데이터 오류로 취급하고 퀴즈를 시작하지 않는다.

### 8.6 점수 계산

- 한 세션은 해당 Day의 30문제다.
- 최초 확정 답변만 채점한다.
- 점수는 `Math.round((correctCount / totalCount) * 100)`이다.
- 30문제 기준 만점만 정확히 100점이다.
- 세션 도중 이탈한 경우 최고 점수를 갱신하지 않는다.
- 마지막 문제의 피드백 확인까지 완료했을 때 세션 완료로 판단한다.

### 8.7 필수 채점 테스트

- 대소문자와 앞뒤 공백 허용
- 다중 공백 단일화
- NFKC 전각 문자 처리
- 대표 답안과 허용 답안 모두 인정
- 부분 문자열 거부
- 빈 문자열 및 문장부호만 있는 문자열 거부
- 한 글자 및 `하다` 단독 입력 거부
- `출퇴근`과 `출퇴근하다` 보조 비교
- apostrophe 및 하이픈 정책
- 서로 다른 단어가 정규화 후 충돌하는 데이터 탐지

---

## 9. 사용자 경험과 화면 구조

### 9.1 전역 구조

앱은 별도 URL 라우터 없이 다음 상태로 화면을 전환한다.

- 선택 Day
- `study`
- `ko-to-en`
- `en-to-ko`
- `incorrect`

새로고침 시 기본 화면은 마지막 선택 Day의 학습 탭이다. 마지막 Day 선택은 `localStorage`에 단순 UI 선호로 저장할 수 있으나 학습 데이터의 원본은 IndexedDB다. 저장 값이 현재 인덱스에 없으면 첫 번째 사용 가능 Day로 되돌린다.

### 9.2 Header

- 제품명 `voca3000`
- 현재 Day 및 카테고리
- 해당 Day 학습 완료 여부
- 해당 Day 암기 완료 수 / 30
- 백업·복원 버튼
- 모바일에서 정보가 잘리지 않도록 축약 레이아웃 제공

### 9.3 DaySelector

- `words-index.json`에 존재하는 Day만 활성화한다.
- 완료 Day와 미완료 Day를 시각적으로 구분하되 색상만으로 상태를 전달하지 않는다.
- 키보드 방향키 또는 Tab으로 이동 가능하다.
- 선택 변경 중 데이터 로드 실패 시 기존 Day 화면을 즉시 파괴하지 않고 오류 안내를 제공한다.

### 9.4 탭

- 학습
- 한→영
- 영→한
- 오답노트

탭은 `role="tablist"`, 각 탭은 `role="tab"`, 콘텐츠는 `role="tabpanel"`을 사용한다. 선택 상태는 `aria-selected`로 전달한다.

### 9.5 StudyDeck

- 모바일 기본은 한 장씩 넘기는 카드 흐름이다.
- 넓은 화면에서는 카드 흐름 또는 2열 그리드를 사용할 수 있으나 학습 완료 판정이 일관되어야 한다.
- 현재 카드 번호와 전체 개수를 표시한다.
- 이전/다음 버튼 및 키보드 이동을 지원한다.
- 터치 스와이프는 보조 기능이며 버튼 없이만 조작하도록 만들지 않는다.

### 9.6 FlashCard

상태:

- 가림 방향: 한국어 가리기 / 영어 가리기
- 정답 공개 여부
- 암기 완료 여부
- TTS 재생 여부

한국어 가리기:

- 영어 표제어, IPA, 영어 예문을 노출한다.
- 한국어 뜻과 번역은 시각적으로 가리되 버튼으로 구현한다.

영어 가리기:

- 한국어 뜻과 번역을 노출한다.
- 영어 표제어와 예문 내 목표 표현을 공개 버튼으로 대체하거나 가린다.
- 예문 내 단어 치환은 대소문자 및 숙어 경계를 고려해야 하며 찾지 못하면 예문 전체를 깨뜨리지 않는다.

공통:

- 가림막은 클릭 가능한 `button`이어야 한다.
- `aria-expanded`와 구체적인 `aria-label`을 제공한다.
- 단순 CSS blur 뒤에 실제 텍스트가 선택·복사되는 구조는 피한다.
- TTS 버튼은 미지원 시 disabled와 안내 문구를 제공한다.
- “외웠어요” 토글은 낙관적 UI를 사용할 수 있으나 DB 실패 시 원래 상태로 되돌리고 오류를 알린다.

### 9.7 QuizCard 상태 머신

```text
loading → answering → evaluating → feedback-correct → next
                              └→ feedback-incorrect → waiting-confirmation → next
마지막 문제 next → completed
```

규칙:

- `answering`에서만 입력을 받는다.
- 빈 답안 제출은 채점하지 않고 입력 안내를 표시한다.
- IME 조합 중 Enter는 제출로 처리하지 않는다.
- 제출 즉시 중복 제출을 잠근다.
- 정답은 성공 상태를 보여준 뒤 짧은 지연 후 다음 문제로 이동한다.
- 오답은 흔들림과 오류 테두리를 표시하고 올바른 답을 공개한다.
- 오답은 사용자가 확인 버튼을 누르기 전까지 다음 문제로 이동하지 않는다.
- 확인 버튼은 Enter로 실행 가능하다. Space는 버튼에 포커스가 있을 때만 기본 버튼 동작으로 처리하여 입력창의 공백 입력과 충돌하지 않는다.
- 다음 문제로 이동한 뒤 입력창에 프로그래밍 방식으로 포커스를 이동한다.
- 화면 읽기 사용자를 위해 정답/오답 메시지는 `aria-live="polite"` 영역에 전달한다.

### 9.8 QuizScore

- 맞힌 개수 / 전체 개수
- 100점 환산 점수
- 최고 점수 갱신 여부
- 틀린 단어 목록과 정답
- 다시 풀기
- 오답노트로 이동
- 학습 화면으로 이동

100점일 때만 confetti를 실행하며 `prefers-reduced-motion`이 활성화된 경우 실행하지 않는다.

### 9.9 오답노트

- 전체 / 한→영 / 영→한 필터
- 최근 틀린 방향 표시
- 누적 오답 횟수 표시
- 단어 뜻과 예문 재확인
- 해당 단어 TTS
- 항목이 없으면 긍정적인 빈 상태 제공
- 오답노트에서 임의로 기록을 삭제하는 기능은 MVP에 포함하지 않는다. 다시 퀴즈에서 맞히면 최근 결과 기준으로 자동 해소된다.

---

## 10. 애니메이션 및 모션 감축

앱 루트를 다음 정책으로 감싼다.

```tsx
<MotionConfig reducedMotion="user">
  <App />
</MotionConfig>
```

- 오답 흔들림 기본값: `x: [-10, 10, -8, 8, -4, 4, 0]`, 총 0.4초
- 정답/오답 테두리 변화는 색상 외에 아이콘과 텍스트를 함께 사용한다.
- 카드 전환은 transform과 opacity 위주로 구성한다.
- `useReducedMotion()` 결과가 true이면 흔들림, 슬라이드, confetti를 생략하고 즉시 상태만 변경한다.
- Tailwind `motion-reduce:*`도 CSS transition에 함께 적용한다.
- 애니메이션 때문에 다음 조작이 막히지 않아야 한다.

---

## 11. Web Speech TTS

### 11.1 동작

- `speechSynthesis` 지원 여부를 감지한다.
- 음성 목록을 즉시 조회하고 `voiceschanged` 이벤트에서도 다시 조회한다.
- `en-US` 음성을 우선 선택하고 없으면 `en-*`, 그마저 없으면 브라우저 기본 음성을 사용한다.
- rate 기본값은 `0.92`, lang은 `en-US`다.
- 새 발음 요청 전 기존 큐를 취소한다.
- `onstart`, `onend`, `onerror`로 재생 상태를 갱신한다.

### 11.2 안전한 이벤트 수명주기

- `onvoiceschanged = ...`로 전역 핸들러를 덮어쓰지 않는다.
- `addEventListener`와 `removeEventListener`를 사용한다.
- 훅 언마운트 시 이벤트를 제거하고 재생을 취소한다.
- 취소된 이전 utterance의 종료 이벤트가 최신 재생 상태를 덮어쓰지 않도록 현재 utterance ref를 비교한다.
- 콘솔 오류만 남기지 말고 버튼 주변에 재생 실패를 알릴 수 있는 접근 가능한 상태를 반환한다.

### 11.3 반환 API

```typescript
{
  speak: (text: string) => void;
  stop: () => void;
  isPlaying: boolean;
  isSupported: boolean;
  error: string | null;
}
```

---

## 12. 백업 및 복원

### 12.1 백업 타입

```typescript
export interface VocaBackupPayload {
  schemaVersion: 1;
  appVersion: string;
  exportedAt: string;
  totalMasteredCount: number;
  data: {
    progress: UserProgressRecord[];
    daySessions: DaySessionSummary[];
  };
}
```

`appVersion`은 하드코딩을 여러 파일에 반복하지 않고 `src/constants/app.ts`의 단일 상수에서 가져온다.

### 12.2 내보내기

- 두 테이블을 읽고 JSON Blob으로 다운로드한다.
- 파일명: `voca3000-backup-YYYY-MM-DD.json`
- JSON은 UTF-8이며 사람이 읽을 수 있도록 2칸 들여쓰기를 사용한다.
- 내보내기에 실패하면 성공 파일처럼 다운로드하지 않는다.

### 12.3 복원 전 런타임 검증

TypeScript `as` 캐스팅은 검증으로 인정하지 않는다. 직접 type guard를 구현하거나 런타임 스키마 라이브러리를 사용한다.

필수 검증:

- 최상위 객체 여부
- 정확히 지원하는 `schemaVersion`
- `appVersion`, `exportedAt` 타입과 유효한 날짜
- `data.progress`, `data.daySessions` 배열 여부
- 각 progress의 비어 있지 않은 `wordId`
- boolean 및 enum 필드 타입
- 모든 카운트가 0 이상의 정수인지
- Day가 1~100 정수인지
- 점수가 0~100 정수인지
- 날짜 문자열이 유효한지
- progress `wordId` 및 daySessions `day` 기본키 중복 여부
- 정적 데이터 인덱스로 확인 가능한 wordId인지
- 지나치게 큰 파일을 방지하기 위한 레코드 수 상한: progress 3,000개, daySessions 100개

`totalMasteredCount`는 참고 메타데이터이며, 복원 시 progress를 기준으로 다시 계산해 불일치하면 데이터 오류로 처리한다.

### 12.4 복원 정책

- MVP는 병합이 아닌 전체 덮어쓰기만 지원한다.
- 파일 선택 직후 덮어쓰지 않고, 현재 데이터가 교체된다는 확인 단계를 제공한다.
- 검증이 모두 성공한 후 하나의 Dexie `rw` 트랜잭션 안에서 두 테이블을 clear하고 bulkPut한다.
- bulkPut 실패 시 트랜잭션 전체가 롤백되어 기존 데이터가 보존되어야 한다.
- 성공 후 live query를 통해 화면이 갱신되어야 한다.
- 실패 메시지는 JSON 파싱 오류, 지원하지 않는 버전, 구조 오류, DB 쓰기 오류를 구분한다.

### 12.5 개인정보 및 보안

- 앱은 백업 내용을 외부 서버로 전송하지 않는다.
- 파일은 브라우저 안에서만 읽고 처리한다.
- 백업 문자열을 `innerHTML`로 렌더링하지 않는다.
- 오류 메시지에 전체 백업 데이터를 출력하지 않는다.

---

## 13. 접근성 기준

- 모든 기능은 마우스 없이 키보드만으로 완주 가능해야 한다.
- 의미 있는 HTML 요소를 우선하고 div에 클릭 이벤트만 붙이지 않는다.
- 아이콘 단독 버튼에는 `aria-label` 또는 시각적으로 숨긴 텍스트가 있어야 한다.
- 포커스 표시를 제거하지 않는다.
- 모달은 열릴 때 내부로 포커스를 이동하고, 닫힐 때 열었던 버튼으로 돌려보낸다.
- 모달은 focus trap, Escape 닫기, 적절한 dialog 이름을 제공한다.
- 자동 포커스는 문제 전환처럼 사용자가 예상 가능한 상황에서만 수행한다.
- 색상 대비는 WCAG AA를 목표로 한다.
- 상태를 색상만으로 전달하지 않는다.
- 진행률에는 시각적 바뿐 아니라 텍스트와 `aria-valuenow`, `aria-valuemin`, `aria-valuemax`를 제공한다.
- 로딩, 정답, 오답, 저장 실패는 적절한 live region으로 전달한다.
- 200% 확대와 320px 너비에서 가로 스크롤 없이 핵심 기능을 사용할 수 있어야 한다.
- OS 모션 감축 설정을 CSS와 Motion 양쪽에서 준수한다.

---

## 14. 오류, 로딩 및 복구 UX

### 14.1 반드시 구분할 상태

- 앱 초기 로딩
- Day 인덱스 로딩
- Day 데이터 로딩
- 데이터 없음
- 네트워크/정적 파일 로딩 실패
- JSON 형식 또는 데이터 검증 실패
- IndexedDB 열기 실패
- IndexedDB 쓰기 실패
- TTS 미지원
- TTS 재생 실패
- 백업 파싱 실패
- 백업 검증 실패
- 백업 복원 트랜잭션 실패

### 14.2 오류 처리 원칙

- 사용자 메시지는 해결 행동을 제시한다.
- 가능한 오류에는 “다시 시도” 버튼을 제공한다.
- DB 저장 실패를 성공한 것처럼 표시하지 않는다.
- React 렌더링 오류는 `AppErrorBoundary`가 포착하고 새로고침 안내를 제공한다.
- 개발자용 상세 오류는 콘솔에 기록하되 사용자 데이터 전체를 포함하지 않는다.
- 오류가 특정 기능에 한정되면 앱 전체를 차단하지 않는다. 예를 들어 TTS 실패는 카드 학습을 막지 않는다.

---

## 15. 성능 및 상태 관리

- 별도의 전역 상태 라이브러리는 사용하지 않는다.
- 화면 로컬 상태는 React state와 custom hook으로 관리한다.
- 영속 상태는 Dexie와 `useLiveQuery`가 원본이다.
- 한 Day의 30개 단어만 메모리에 로딩한다.
- 3,000개 정적 데이터를 하나의 거대한 번들에 import하지 않는다.
- Day JSON은 선택 시 fetch하고 동일 세션에서는 간단한 메모리 캐시를 사용할 수 있다.
- live query 안에서는 원칙적으로 Dexie API만 사용한다.
- 불필요한 전체 목록 재렌더링을 피하되 성급한 memoization은 하지 않는다.
- 아이콘은 필요한 항목만 named import한다.
- 초기 로딩에 필요하지 않은 백업 모달이나 confetti는 동적 import를 고려한다.

---

## 16. 테스트 전략

### 16.1 단위 테스트: 채점

`src/test/textMatcher.test.ts`에서 8.7의 모든 사례를 검증한다. 한영과 영한 모드를 분리하고 정상·경계·거부 사례를 모두 포함한다.

### 16.2 DB 테스트

`fake-indexeddb`에서 각 테스트 전에 독립 DB를 사용한다.

필수 사례:

- 최초 암기 토글 레코드 생성
- 반복 토글
- 모드별 정답/오답 카운트 증가
- 최근 결과 갱신
- 동시 또는 빠른 연속 업데이트에서 값 유실 없음
- 학습 완료 기록
- 모드별 최고 점수만 갱신
- 낮은 점수가 최고 점수를 덮어쓰지 않음
- 유효하지 않은 day와 score 거부
- 오답노트 필터 쿼리
- 복원 성공
- 유효하지 않은 복원 거부
- bulkPut 실패 시 기존 데이터 롤백

### 16.3 데이터 검증 테스트

- 인덱스 Day 중복
- 파일 경로 및 개수 일치
- 단어 ID 전역 유일성
- ID 형식
- Day/category 일치
- 필수 문자열
- 허용 답안 정규화 후 빈 값 및 중복
- 정답 집합 충돌
- 정확히 30개인 완성 Day

### 16.4 컴포넌트 테스트

React Testing Library와 `user-event`를 사용한다.

- 탭 키보드 전환
- FlashCard 공개/가림 및 aria 상태
- 암기 토글 성공과 DB 실패 롤백
- IME 조합 중 Enter 제출 방지
- 빈 답안 제출 방지
- 정답 후 다음 문제
- 오답 후 확인 전 진행 차단
- 확인 후 다음 입력 포커스
- 중복 제출 방지
- 모달 포커스 이동·복귀·Escape
- 모션 감축 시 confetti 미실행
- TTS 미지원 상태

### 16.5 빌드 전 품질 게이트

아래 명령이 모두 성공해야 완료로 간주한다.

```bash
npm run lint
npm run test:run
npm run build
```

경고를 무시하기 위한 임의의 ESLint disable, `any`, 타입 단언 남용은 금지한다. 불가피한 예외는 이유를 인접 주석으로 기록한다.

---

## 17. GitHub Pages 배포

### 17.1 배포 방식

- GitHub Actions 공식 Pages 액션을 사용한다.
- `main` 브랜치 push와 수동 실행을 지원한다.
- `npm ci` → lint → test → build → `dist` 업로드 → Pages 배포 순서다.
- PR에서는 배포하지 않고 검증만 수행한다.
- 저장소 Settings에서 Pages source를 GitHub Actions로 설정한다.

### 17.2 배포 검증

- 루트 화면 직접 접근
- JS/CSS asset 404 없음
- `words-index.json` 로딩
- `words-day01.json` 로딩
- 새로고침 후 앱 정상 실행
- IndexedDB 저장 후 새로고침 시 유지
- 백업 파일 다운로드와 복원
- 모바일 뷰

클라이언트 라우터를 도입하지 않으므로 deep-link fallback 문제는 MVP에 없다. 향후 라우팅을 추가하면 GitHub Pages 404 전략을 별도로 설계한다.

---

## 18. 구현 순서

### 단계 1: 기반 구성

- 사전 환경 검사
- 안전한 Vite 템플릿 추출
- 의존성 설치
- Tailwind 및 Vitest 설정
- scripts와 `.gitignore` 확인
- 빈 앱의 lint/test/build 통과

### 단계 2: 타입과 데이터 로딩

- 공통 타입 작성
- validators 작성
- Day 인덱스와 Day 01 JSON 작성
- wordRepository 구현
- 데이터 무결성 테스트

### 단계 3: DB와 백업

- Dexie 스키마 작성
- 필수 DB 함수 구현
- `useLiveQuery` 기반 진도 hook
- 백업 export 및 엄격한 restore 검증
- fake-indexeddb 테스트

### 단계 4: 채점과 퀴즈 상태 머신

- 정규화 함수
- evaluateQuizAnswer
- useQuizSession
- 점수 계산과 중복 제출 방지
- 단위 테스트 통과

### 단계 5: 기본 UI

- 디자인 토큰과 전역 레이아웃
- Header, DaySelector, tabs, ProgressBar
- 로딩·빈 상태·오류 경계
- 반응형 레이아웃

### 단계 6: 학습 UI

- StudyDeck
- FlashCard 양방향 가림
- 암기 토글
- 학습 완료 판정
- TTS

### 단계 7: 퀴즈와 오답노트

- QuizCard와 상태별 피드백
- ShakeWrapper와 모션 감축
- QuizScore 및 최고 점수
- confetti 조건
- 오답노트 필터와 재학습 표시

### 단계 8: 접근성 및 복원 UI

- BackupModal
- 키보드 전체 흐름
- ARIA 및 live region
- 모달 포커스 관리
- 320px/200% 확대 검증

### 단계 9: 최종 검증 및 배포

- lint/test/build
- 개발 서버 수동 QA
- GitHub Actions 작성
- Pages 배포 후 smoke test
- README에 실행·테스트·배포·백업 안내 반영

각 단계가 실패한 상태에서 다음 단계로 넘어가지 않는다.

---

## 19. 완료 조건(Definition of Done)

### 기능

- Day 01의 정확히 30개 단어를 불러온다.
- 한국어/영어 가리기 학습이 모두 작동한다.
- 모든 단어의 암기 상태가 새로고침 후 유지된다.
- 한→영 및 영→한 30문제 퀴즈를 완료할 수 있다.
- 채점은 명시한 완전 일치 정책을 따른다.
- 오답은 확인 전 넘어가지 않는다.
- 최고 점수가 모드별로 저장된다.
- 오답노트가 최근 결과 기준으로 정확히 갱신된다.
- 백업 다운로드와 원자적 덮어쓰기 복원이 작동한다.
- TTS 지원 환경에서 발음이 재생되고 미지원 환경에서 앱이 깨지지 않는다.

### 품질

- TypeScript 빌드 오류 없음
- ESLint 오류 없음
- 전체 테스트 통과
- 콘솔에 처리되지 않은 오류·Promise rejection 없음
- 데이터 검증 통과
- DB 실패를 성공으로 오인시키는 UI 없음
- 중복 제출이나 빠른 연속 클릭으로 카운트가 중복 기록되지 않음

### 접근성

- 키보드만으로 Day 선택, 학습, 두 퀴즈, 오답노트, 백업 모달 이용 가능
- 의미 있는 포커스 표시
- 모달 포커스 관리
- 정답·오답 상태의 텍스트 전달
- 모션 감축 적용
- 320px와 200% 확대에서 핵심 기능 이용 가능

### 배포

- GitHub Pages URL에서 asset과 JSON 404 없음
- Actions의 lint/test/build/deploy 성공
- 새로고침 후 저장 데이터 유지
- README 실행 방법 최신화

---

## 20. 수동 QA 체크리스트

### 최초 실행

- [ ] 빈 IndexedDB에서 앱이 열린다.
- [ ] Day 01이 선택된다.
- [ ] 30개 데이터가 로딩된다.
- [ ] 로딩 중 적절한 상태가 보인다.

### 학습

- [ ] 두 가림 모드가 정확히 작동한다.
- [ ] 키보드로 공개할 수 있다.
- [ ] 이전/다음 및 모바일 스와이프가 작동한다.
- [ ] 암기 상태가 저장된다.
- [ ] 30개 열람 후 학습 완료가 기록된다.
- [ ] TTS 재생·중단·오류 상태가 정상이다.

### 퀴즈

- [ ] 한영과 영한 문제가 올바르게 출제된다.
- [ ] IME 입력 중 Enter가 오제출되지 않는다.
- [ ] 허용 답안과 거부 답안이 명세대로 판정된다.
- [ ] 오답 정답 공개 후 확인 전 진행되지 않는다.
- [ ] 문제 전환 후 입력 포커스가 복원된다.
- [ ] 한 문제 결과가 한 번만 기록된다.
- [ ] 마지막 문제 후 점수 화면이 표시된다.
- [ ] 최고 점수가 모드별로 유지된다.
- [ ] 100점과 모션 허용 상태에서만 confetti가 실행된다.

### 오답노트

- [ ] 전체/한영/영한 필터가 맞다.
- [ ] 같은 모드에서 다시 맞힌 단어의 최근 오답 상태가 해소된다.
- [ ] 누적 오답 횟수는 유지된다.

### 백업

- [ ] 정상 백업 파일이 다운로드된다.
- [ ] 정상 파일 복원이 성공한다.
- [ ] 잘못된 JSON이 거부된다.
- [ ] 잘못된 타입·범위·중복키가 거부된다.
- [ ] 미래 schemaVersion이 거부된다.
- [ ] 복원 실패 시 기존 데이터가 보존된다.
- [ ] 성공 후 화면이 즉시 갱신된다.

### 반응형 및 접근성

- [ ] 320px 모바일 너비에서 사용 가능하다.
- [ ] 데스크톱에서 과도하게 늘어나지 않는다.
- [ ] 200% 확대에서 핵심 조작이 보인다.
- [ ] 키보드 포커스 순서가 자연스럽다.
- [ ] 화면 읽기용 이름과 상태가 존재한다.
- [ ] 모션 감축 설정에서 흔들림·슬라이드·confetti가 제거된다.

### 배포

- [ ] Pages에서 앱 진입이 된다.
- [ ] 정적 데이터가 로드된다.
- [ ] asset 404가 없다.
- [ ] 새로고침과 로컬 저장이 정상이다.

---

## 21. Git 작업 원칙

- 원격 `origin`은 `https://github.com/jxnyxng/voca3000.git`이다.
- 기본 브랜치는 `main`이다.
- 구현 전 원격 상태를 확인하고, 원격에 기존 커밋이 있다면 임의로 덮어쓰지 않는다.
- 사용자 데이터, `.env`, 빌드 결과물, 임시 스캐폴딩 폴더는 커밋하지 않는다.
- 기능 단위로 작고 설명 가능한 커밋을 만든다.
- 강제 push는 하지 않는다.
- lint/test/build가 실패한 상태를 완료로 보고하지 않는다.

권장 커밋 단위:

1. `chore: scaffold React and Tailwind app`
2. `feat: add word data contracts and loader`
3. `feat: add progress database and backup`
4. `feat: add study experience`
5. `feat: add quiz modes and incorrect notes`
6. `test: cover matching database and UI flows`
7. `ci: deploy app to GitHub Pages`

---

## 22. 구현자가 임의로 바꾸면 안 되는 결정

- 서버나 로그인 시스템을 추가하지 않는다.
- 정적 단어 데이터를 IndexedDB 원본으로 옮기지 않는다.
- 부분 문자열 채점을 다시 도입하지 않는다.
- 오답을 자동으로 즉시 넘기지 않는다.
- 퀴즈 결과로 `isMastered`를 자동 변경하지 않는다.
- 백업을 검증 없이 DB에 넣지 않는다.
- 복원을 여러 독립 트랜잭션으로 나누지 않는다.
- 존재하지 않는 Day를 선택 가능하게 만들지 않는다.
- public 데이터 fetch에 루트 절대경로를 사용하지 않는다.
- 모션 감축 사용자를 대상으로 흔들림이나 confetti를 강제하지 않는다.
- 테스트를 통과시키기 위해 핵심 검증을 제거하지 않는다.

---

## 23. 구현 착수 전 최종 확인

- [ ] Node.js 22.12 이상
- [ ] `origin` URL 확인
- [ ] 원격 저장소 기존 콘텐츠 확인
- [ ] 작업 트리의 기존 사용자 파일 확인
- [ ] `temp-init` 부재 확인
- [ ] Vite 8.x / React 19.x 생성 확인
- [ ] 이 문서를 기준으로 MVP 범위 재확인
- [ ] Day 01 단어 30개의 콘텐츠 검수 계획 확인

위 항목을 확인한 뒤 §18의 순서대로 구현을 시작한다.

---

## 24. 공식 기술 참고 문서

- Vite 시작 및 Node 요구사항: <https://vite.dev/guide/>
- Vite 릴리스 정책: <https://vite.dev/releases>
- React 버전: <https://react.dev/versions>
- Tailwind CSS Vite 설치: <https://tailwindcss.com/docs/installation/using-vite>
- Tailwind 테마 변수: <https://tailwindcss.com/docs/theme>
- Vitest 시작: <https://vitest.dev/guide/>
- Vitest 설정: <https://vitest.dev/config/>
- Dexie React live query: <https://dexie.org/docs/dexie-react-hooks/useLiveQuery/>
- Motion for React 설치: <https://motion.dev/docs/react-installation>
- Web Speech API: <https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis>
- 브라우저 저장소 정책: <https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria>

