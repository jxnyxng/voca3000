# Voca 3000

영어 단어를 Day 단위로 학습하고 진도를 브라우저에 저장하는 웹 애플리케이션입니다.

## 주요 기능

- Day별 단어 카드 학습
- 단어별 암기 여부 및 학습 완료 상태 저장
- 한→영·영→한 퀴즈와 오답노트 기반 구조
- 브라우저 IndexedDB를 이용한 로컬 학습 기록 관리

## 기술 스택

- React 19, TypeScript
- Vite
- Tailwind CSS
- Dexie (IndexedDB)
- Vitest, Testing Library

## 실행 방법

Node.js가 설치된 환경에서 다음 명령을 실행합니다.

```bash
npm install
npm run dev
```

## 검증

```bash
npm run lint
npm run test:run
npm run build
```

## 단어 데이터

단어 목록은 `public/data/words-index.json`에 등록하며, 각 Day의 단어 데이터는 같은 디렉터리의 JSON 파일로 관리합니다.
