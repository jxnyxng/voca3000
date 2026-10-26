# Voca 3000

영어와 일본어 표현을 Day 단위로 학습하는 웹 애플리케이션입니다. 비회원 기록은
브라우저의 IndexedDB에 저장하고, 로그인 회원 기록은 IndexedDB와 Neon PostgreSQL
사이에 자동 동기화합니다.

현재 서버·DB·인증·배포 연결 구조는 [`SYSTEM_ARCHITECTURE.md`](./SYSTEM_ARCHITECTURE.md)를 참고하세요.

## 저장소 구조

```text
voca3000/
├── frontend/  # React, Vite, IndexedDB 기반 웹 애플리케이션
└── backend/   # Spring Boot API, OAuth2 인증, Neon 동기화 서버
```

운영 서비스는 프론트엔드와 백엔드를 하나의 Docker 이미지로 빌드하여 AWS EC2에서
제공합니다. 공식 주소는 <https://worddeuk.kr/>입니다.

## 주요 기능

- 영어·일본어 Day 1~50 학습 데이터
- 한국어↔영어 및 한국어↔일본어 양방향 무작위 퀴즈
- 한국어/학습 언어 가리기, 카드 섞기, 모바일 스와이프
- 단어별 암기 상태, Day 학습 완료, 모드별 최고 점수 저장
- 최근 결과 기준 오답노트와 방향별 필터
- 영어·일본어 음성 재생
- JSON 파일을 이용한 학습 기록 백업과 원자적 복원
- 모바일·데스크톱 반응형 UI와 키보드 접근성

학습 기록은 IndexedDB에 먼저 저장됩니다. 로그인 회원은 앱 시작 시 Neon의 기록을
내려받아 로컬 기록과 병합하고, 이후 로컬 변경분을 Neon으로 자동 전송합니다.
비회원 기록과 커스텀 노래 원문은 브라우저에만 남으므로 백업 파일도 보관하세요.

## 로컬 실행

Node.js 22.12 이상과 npm이 필요합니다.

```bash
cd frontend
npm ci
npm run dev
```

개발 서버를 로컬 주소에 고정하려면 다음 명령을 사용합니다.

```bash
cd frontend
npm run dev -- --host 127.0.0.1
```

## 검증과 빌드

```bash
cd frontend
npm run lint
npm run test:run
npm run build
```

프로덕션 결과물은 `frontend/dist/`에 생성됩니다. `frontend/vite.config.ts`의 상대 BASE_URL 설정을 사용하므로 GitHub Pages의 저장소 하위 경로에서도 asset과 단어 JSON을 불러올 수 있습니다.

## 단어 데이터

배포 데이터는 `public/data/`에 있으며 언어별 인덱스가 각 Day JSON을 가리킵니다.

- 영어: `words-index.json`, `words-dayNN.json`
- 일본어: `japanese-words-index.json`, `japanese-words-dayNN.json`
- 영어 원본: `eng_vocabs/`
- 일본어 원본: `jap_vocabs/`

데이터 형식, 변환 명령과 검증 절차는 [`VOCAB_IMPORT_GUIDE.md`](./frontend/VOCAB_IMPORT_GUIDE.md)를 참고하세요. 생성된 `frontend/public/data` JSON만 직접 수정하지 말고 원본을 교정한 뒤 import 명령을 다시 실행합니다.

## 백엔드 실행

Java 17 이상과 Docker가 필요합니다.

```bash
cd backend
./gradlew test
docker compose up -d
./gradlew bootRun
```

자세한 로컬 설정은 [`backend/README.md`](./backend/README.md)를 참고하세요.

## 백업과 복원

학습 화면 상단의 백업 버튼에서 현재 언어의 학습 기록을 JSON으로 내려받을 수 있습니다. 복원은 파일 구조와 버전, ID, 값의 범위를 모두 검증한 후 기존 기록을 하나의 트랜잭션으로 교체합니다.

영어와 일본어는 별도 IndexedDB를 사용하므로 필요한 언어 화면에서 각각 백업하세요.

## GitHub Pages 배포

브랜치는 다음 용도로 구분합니다.

- `dev`: 기본 개발 브랜치. 기능 개발, 로컬 확인과 CI 검증은 이 브랜치에서 진행합니다.
- `main`: 운영 브랜치. 사용자가 배포를 승인한 경우에만 검증된 `dev`를 반영합니다.

`dev`와 `main` 푸시는 모두 lint·테스트·빌드를 실행하지만, GitHub Pages 배포는 `main` 푸시 또는 수동 실행에서만 수행합니다. EC2 운영 배포도 `main` 반영 후 별도로 진행합니다.

`.github/workflows/pages.yml`은 다음 경우에 실행됩니다.

- Pull Request: `npm ci` → lint → test → build 검증만 실행
- `main` push: 검증 후 `dist/`를 GitHub Pages에 배포
- Actions의 수동 실행: 선택한 ref를 검증하고 배포

최초 배포 전에 저장소의 **Settings → Pages → Build and deployment → Source**를 **GitHub Actions**로 설정해야 합니다. 이후 `main`에 push하면 Actions의 `github-pages` 환경을 통해 배포됩니다.

예상 배포 주소:

<https://jxnyxng.github.io/voca3000/>

배포 후 루트 화면, 영어·일본어 Day JSON, 새로고침 후 IndexedDB 유지, 백업·복원과 모바일 화면을 smoke test합니다.

## AWS 회원 기능 통합 배포

회원 기능은 프론트와 API를 같은 HTTPS 주소에서 제공하도록 루트 `Dockerfile`로
통합 빌드합니다. 운영 트래픽은 `worddeuk.kr`의 AWS EC2 Nginx가 받고 Docker로
실행되는 Spring Boot 애플리케이션으로 전달합니다. Spring Boot는 React 정적 파일,
API, Google OAuth2 인증을 함께 제공하고 외부 관리형 Neon PostgreSQL에 연결합니다.

EC2의 운영 실행 환경에는 다음 비밀 환경변수를 설정해야 합니다.

- `DB_URL`: `jdbc:postgresql://...` 형식이며 TLS 옵션을 포함한 운영 DB 주소
- `DB_USERNAME`, `DB_PASSWORD`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

Google OAuth 클라이언트의 운영 콜백은 다음과 같습니다.

```text
https://worddeuk.kr/login/oauth2/code/google
```

운영 상태는 <https://worddeuk.kr/actuator/health>에서 확인합니다. 저장소의
`render.yaml`은 이전 Render 배포 설정으로, 현재 AWS 운영 경로에는 사용하지 않습니다.
Neon 플랜의 보존·백업 제한을 확인하고 중요한 학습 기록은 기존 JSON 백업으로도
보관합니다.
