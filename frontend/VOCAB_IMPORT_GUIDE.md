# 단어 데이터 추가 가이드

이 문서는 영어 단어 Day 묶음을 계속 추가할 때 사용하는 작업 기준이다.

## 현재 상태

- 영어: Day 1~50, 총 1,500개 (`w0001`~`w1500`)
- 일본어: Day 1~50, 총 1,500개 (`j0001`~`j1500`)
- 영어 원본: `eng_vocabs/`의 10개 묶음 파일
- 일본어 원본: `jap_vocabs/`의 5개 묶음 파일
- 생성 결과: `public/data/words-dayNN.json`, `public/data/japanese-words-dayNN.json` 및 언어별 인덱스
- 변환 도구: `scripts/import-vocab-md.mjs`, `scripts/import-japanese-vocab.mjs`

## 다음 데이터 준비 방법

5개 Day씩 하나의 Markdown 파일로 준비한다. 다음 파일은 예를 들어
`english_vocab_day_11_to_15.md`로 만들며, JSON 배열 전체를 파일에 넣는다.

각 Day는 정확히 30개여야 하며 ID는 전체 순서대로 이어져야 한다.

- Day 11: `w0301`~`w0330`
- Day 12: `w0331`~`w0360`
- Day 15: `w0421`~`w0450`

레코드 형식:

```json
{
  "id": "w0301",
  "day": 11,
  "category": "카테고리 영문명",
  "word": "target expression",
  "meaning": "대표 한국어 뜻",
  "pronunciation": "/미국식 IPA/",
  "partOfSpeech": "verb",
  "exampleEn": "The example contains the exact target expression.",
  "exampleKo": "영어 예문과 의미가 일치하는 번역.",
  "acceptableAnswersKo": ["허용할 유사 뜻"],
  "acceptableAnswersEn": ["허용할 영어 동의 표현"],
  "language": "en"
}
```

`partOfSpeech`는 `verb`, `noun`, `adjective`, `adverb`, `phrase` 중 하나만 사용한다.

## 콘텐츠 작성 규칙

1. `word`와 양방향 정답은 같은 Day 안에서 중복되지 않게 한다. 퀴즈가 Day 단위로 출제되므로 다른 Day의 핵심 표현은 복습을 위해 다시 등장할 수 있다.
2. `exampleEn`에는 `word`를 활용형이 아닌 동일한 문자열로 포함한다. 카드의 표현 가리기 기능에 필요하다.
3. `pronunciation`은 `/.../` 형태의 미국식 IPA로 작성한다.
4. 대표 뜻과 허용 답안은 너무 짧거나 넓은 표현을 피한다.
5. 다른 학습 단어 자체를 동의 답안으로 넣지 않는다. 예: 별도 단어가 `tidy`라면 `neat`의 허용 영어 답안에 `tidy`를 넣지 않는다.
6. 한국어 허용 답안도 다른 단어의 대표 뜻과 겹치지 않게 한다.
7. 영어 예문과 한국어 번역의 시제·주어·의미를 일치시킨다.
8. Markdown 도구가 배열 괄호를 `\[`처럼 이스케이프해도 변환기가 처리한다.

## 반영 명령

새 파일만 지정하면 기존 Day를 보존하고 새 Day를 병합한다.

```bash
npm run import:vocab -- english_vocab_day_11_to_15.md
```

일본어 Day 1~50 전체를 교체할 때는 다음 명령을 사용한다.

```bash
npm run import:japanese-vocab -- \
  jap_vocabs/japanese_vocab_day_1_to_5.json \
  jap_vocabs/japanese_vocab_day_6_to_10.json \
  jap_vocabs/japanese_vocab_day_11_to_15.json \
  jap_vocabs/japanese_vocab_day_16_to_20.json \
  jap_vocabs/japanese_vocab_day_21_to_25.json \
  jap_vocabs/japanese_vocab_day_26_to_30.json \
  jap_vocabs/japanese_vocab_day_31_to_35.json \
  jap_vocabs/japanese_vocab_day_36_to_40.json \
  jap_vocabs/japanese_vocab_day_41_to_45.json \
  jap_vocabs/japanese_vocab_day_46_to_50.json
```

일본어 레코드는 `j0001`부터 Day당 30개씩 이어지고 `language`가 반드시 `ja`여야 한다. `pronunciation`에는 비어 있지 않은 한국어식 발음을 기록한다.

기존 원본도 함께 수정했다면 수정한 파일을 모두 넘긴다.

```bash
npm run import:vocab -- \
  english_vocab_day_1_to_5.md \
  english_vocab_day_6_to_10.md \
  english_vocab_day_11_to_15.md
```

새 카테고리가 등장하면 다음 두 곳에 같은 영문 카테고리와 한국어 제목을 추가한다.

- `src/types/word.ts`의 `CATEGORIES`
- `scripts/import-vocab-md.mjs`의 `categoryTitles`

## 검증 및 교정 순서

```bash
npm run lint
npm run test:run
npm run build
git diff --check
```

검증에서 `ANSWER_COLLISION`이 발생하면 표시된 두 단어 중 부정확하거나 지나치게 넓은 허용 답안을 원본 Markdown에서 제거한다. 대표 뜻끼리 겹치면 문맥이 드러나도록 뜻을 구체화한다. 생성된 JSON만 직접 고치지 말고 반드시 Markdown 원본을 고친 뒤 변환 명령을 다시 실행한다.

데이터 범위를 늘릴 때 `src/test/wordData.test.ts`에 새 Day JSON import와 Map 항목을 추가하고, 전체 Day 수와 마지막 ID 기대값을 갱신한다. `src/test/wordRepository.test.ts`의 인덱스 길이와 미등록 Day 테스트 값도 갱신한다.

## 완료 기준

- 각 Day 30개
- ID 연속·중복 없음
- 같은 Day 안의 단어 및 양방향 정답 충돌 없음
- 모든 예문에 학습 표현 원문 포함
- IPA와 한국어 예문이 비어 있지 않음
- lint, 전체 테스트, build, diff check 통과
