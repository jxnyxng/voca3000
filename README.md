# Voca 3000

영어와 일본어 표현을 Day 단위로 학습하고, 학습 기록을 브라우저에 저장하는 웹 애플리케이션입니다.

## 주요 기능

- 영어 Day 1~50, 일본어 Day 1~25 학습 데이터
- 한국어↔영어 및 한국어↔일본어 양방향 무작위 퀴즈
- 한국어/학습 언어 가리기, 카드 섞기, 모바일 스와이프
- 단어별 암기 상태, Day 학습 완료, 모드별 최고 점수 저장
- 최근 결과 기준 오답노트와 방향별 필터
- 영어·일본어 음성 재생
- JSON 파일을 이용한 학습 기록 백업과 원자적 복원
- 모바일·데스크톱 반응형 UI와 키보드 접근성

학습 기록은 서버가 아닌 현재 브라우저의 IndexedDB에 저장됩니다. 브라우저 데이터 삭제나 기기 변경에 대비해 백업 파일을 보관하세요.

## 로컬 실행

Node.js 22.12 이상과 npm이 필요합니다.

```bash
npm ci
npm run dev
```

개발 서버를 로컬 주소에 고정하려면 다음 명령을 사용합니다.

```bash
npm run dev -- --host 127.0.0.1
```

## 검증과 빌드

```bash
npm run lint
npm run test:run
npm run build
```

프로덕션 결과물은 `dist/`에 생성됩니다. `vite.config.ts`의 상대 BASE_URL 설정을 사용하므로 GitHub Pages의 저장소 하위 경로에서도 asset과 단어 JSON을 불러올 수 있습니다.

## 단어 데이터

배포 데이터는 `public/data/`에 있으며 언어별 인덱스가 각 Day JSON을 가리킵니다.

- 영어: `words-index.json`, `words-dayNN.json`
- 일본어: `japanese-words-index.json`, `japanese-words-dayNN.json`
- 영어 원본: `eng_vocabs/`
- 일본어 원본: `jap_vocabs/`

데이터 형식, 변환 명령과 검증 절차는 [`VOCAB_IMPORT_GUIDE.md`](./VOCAB_IMPORT_GUIDE.md)를 참고하세요. 생성된 `public/data` JSON만 직접 수정하지 말고 원본을 교정한 뒤 import 명령을 다시 실행합니다.

## 백업과 복원

학습 화면 상단의 백업 버튼에서 현재 언어의 학습 기록을 JSON으로 내려받을 수 있습니다. 복원은 파일 구조와 버전, ID, 값의 범위를 모두 검증한 후 기존 기록을 하나의 트랜잭션으로 교체합니다.

영어와 일본어는 별도 IndexedDB를 사용하므로 필요한 언어 화면에서 각각 백업하세요.

## GitHub Pages 배포

`.github/workflows/pages.yml`은 다음 경우에 실행됩니다.

- Pull Request: `npm ci` → lint → test → build 검증만 실행
- `main` push: 검증 후 `dist/`를 GitHub Pages에 배포
- Actions의 수동 실행: 선택한 ref를 검증하고 배포

최초 배포 전에 저장소의 **Settings → Pages → Build and deployment → Source**를 **GitHub Actions**로 설정해야 합니다. 이후 `main`에 push하면 Actions의 `github-pages` 환경을 통해 배포됩니다.

예상 배포 주소:

<https://jxnyxng.github.io/voca3000/>

배포 후 루트 화면, 영어·일본어 Day JSON, 새로고침 후 IndexedDB 유지, 백업·복원과 모바일 화면을 smoke test합니다.
