# Voca 3000 시스템 구조 안내

> 목적: 프로젝트에 연결된 프론트엔드, 서버, 인증, 데이터베이스와 배포 구조를 운영자 관점에서 이해하기 위한 문서
>
> 기준 커밋: `7348837` (2026-10-24)

## 1. 전체 구조

서비스는 비회원용 정적 배포와 회원용 통합 배포를 분리한다.

```text
                         ┌────────────────────────────┐
                         │ Google OAuth               │
                         │ 사용자 신원 확인            │
                         └──────────────┬─────────────┘
                                        │ OAuth callback
                                        ▼
┌──────────────┐              ┌────────────────────────────┐
│ 사용자 브라우저 │─────────────▶│ Render                     │
└───────┬──────┘    HTTPS     │ Spring Boot + React 정적 파일 │
        │                     │ 회원 화면/API/세션/권한 검사   │
        │                     └──────────────┬─────────────┘
        │                                    │ JDBC + TLS
        │                                    ▼
        │                         ┌──────────────────────────┐
        │                         │ Neon PostgreSQL          │
        │                         │ 회원·세션·학습 기록        │
        │                         └──────────────────────────┘
        │
        │ HTTPS
        ▼
┌──────────────────────────────┐
│ GitHub Pages                 │
│ 비회원 React 정적 앱          │
│ 영어·일본어 Day 1~3만 포함    │
└──────────────────────────────┘
```

### 운영 주소

- 비회원 정적 앱: `https://jxnyxng.github.io/voca3000/`
- 회원 통합 앱: `https://voca3000-jxnyxng.onrender.com/`
- 상태 확인: `https://voca3000-jxnyxng.onrender.com/actuator/health`
- Google OAuth callback: `https://voca3000-jxnyxng.onrender.com/login/oauth2/code/google`

### 공식 주소 정책과 IndexedDB 주의사항

다음 작업에서 공식 사용자 주소를 Render 통합 앱으로 통일한다. GitHub Pages는 데모와 정적 배포 검증 용도로만 유지한다.

브라우저 IndexedDB는 origin 단위로 격리된다. 따라서 아래 두 저장소는 서로 완전히 별개다.

```text
https://jxnyxng.github.io 의 IndexedDB
https://voca3000-jxnyxng.onrender.com 의 IndexedDB
```

GitHub Pages에서 만든 비회원 학습 기록을 Render 앱이 직접 읽을 수 없다. 비회원이 Render에서 Day 1~3을 학습한 뒤 같은 주소에서 로그인해야 기존 로컬 기록을 안전하게 서버 계정에 연결할 수 있다. GitHub Pages에서 Render로 자동 이전되는 흐름은 제공하지 않는다.

## 2. 사용자 유형별 동작

| 사용자 | 접근 범위 | 콘텐츠 위치 | 학습 기록 |
| --- | --- | --- | --- |
| 비회원 | 영어·일본어 Day 1~3 | GitHub Pages 정적 JSON | 브라우저 IndexedDB |
| 무료 회원 (`FREE`) | Day 1~50 | Render의 인증 콘텐츠 API | IndexedDB + 수동 Neon 동기화 |
| 유료 회원 (`PREMIUM`) | Day 1~100 정책 | 향후 비공개 콘텐츠 저장소 | 향후 자동 동기화 |

현재 Day 51~100 콘텐츠와 결제 기능은 아직 구현하지 않았다. `PREMIUM`은 접근 정책만 준비된 상태다.

## 3. 저장소와 빌드 구조

```text
voca3000/
├── frontend/                  React/Vite 애플리케이션
│   ├── public/data/           원본 Day JSON과 인덱스
│   └── src/                   화면, IndexedDB, API 클라이언트
├── backend/                   Spring Boot API
│   ├── src/main/java/         인증, 콘텐츠, 동기화 코드
│   └── src/main/resources/
│       └── db/migration/      Flyway DB 변경 이력
├── Dockerfile                 Render용 통합 이미지
├── render.yaml               Render Blueprint 설정
└── .github/workflows/         백엔드 CI와 GitHub Pages 배포
```

### GitHub Pages 빌드

`frontend/vite.config.ts`의 `guest-content-only` 플러그인이 production build 마지막에 다음 처리를 한다.

1. 영어·일본어 인덱스를 Day 1~3으로 축소한다.
2. `dist/data`에서 Day 4 이상 JSON을 삭제한다.
3. GitHub Pages에는 비회원용 결과물만 업로드한다.

따라서 배포 URL로 Day 4 JSON을 직접 요청해도 `404`가 반환된다.

### Render 통합 빌드

루트 `Dockerfile`은 세 단계로 빌드한다.

1. Node 이미지에서 `VITE_AUTH_ENABLED=true`로 React를 빌드한다.
2. React 결과물을 Spring Boot의 `static/`에 복사한다.
3. 전체 Day JSON을 Spring Boot JAR의 `member-data/`에 넣고 boot JAR를 만든다.
4. 최종 Java 17 JRE 이미지가 단일 프로세스로 React와 API를 함께 제공한다.

프론트와 API가 같은 출처이므로 OAuth 세션 쿠키와 CSRF 처리가 단순하다.

## 4. 서버 코드 책임

### 인증: `backend/.../auth`

- `SecurityConfig`: 공개 URL과 인증 필요 API, OAuth, CSRF, 로그아웃 정책
- `GoogleOidcUserService`: Google OIDC 사용자 정보를 내부 회원과 연결
- `AuthController`: `/api/me`, `/api/csrf`, 회원 탈퇴
- `SessionConfig`: HTTP 세션을 Neon JDBC 저장소로 강제

인증 세션은 브라우저의 `SESSION` HttpOnly 쿠키로 식별한다. 실제 세션 내용은 Render 메모리가 아니라 Neon에 저장한다.

### 회원: `backend/.../user`

- Google의 변경 가능한 이메일이 아니라 OIDC `sub`를 외부 계정 식별자로 사용한다.
- `UserRole`: `USER`, `ADMIN`과 같은 운영 권한
- `MembershipTier`: `FREE`, `PREMIUM`과 같은 콘텐츠 이용 등급
- 역할과 이용 등급은 서로 다른 개념이므로 혼용하지 않는다.

### 콘텐츠: `backend/.../content`

- `ContentAccessPolicy`: 등급별 최대 Day 결정
- `MemberContentController`: `/api/content/{language}/days`
- `MemberContentService`: JAR 내부 JSON 로드

서버 정책은 다음과 같다.

```text
익명 사용자     → 회원 콘텐츠 API 401
FREE Day 1~50  → 200
FREE Day 51+   → 403
PREMIUM 1~100  → 콘텐츠가 존재하면 200
권한은 있지만 파일 없음 → 404
```

### 학습 기록: `backend/.../sync`

- `GET /api/sync`: 로그인 회원의 서버 snapshot 조회
- `PUT /api/sync`: 로그인 회원의 서버 snapshot 원자적 교체
- 요청 본문의 사용자 ID는 사용하지 않는다.
- Google 세션에서 찾은 내부 `users.id`만 소유권 기준으로 사용한다.
- `PUT`에는 CSRF 토큰이 필요하다.

현재 snapshot 동기화는 연결 검증과 복구를 위한 수동 기능이다. 다음 단계에서 레코드 단위 자동 동기화로 교체할 예정이다.

## 5. Neon 데이터베이스 구조

```text
users
  │ 1
  ├─────────────── N social_accounts
  ├─────────────── N learning_progress
  └─────────────── N day_sessions

spring_session
  │ 1
  └─────────────── N spring_session_attributes
```

### `users`

서비스 내부 회원이다. 이메일, 표시 이름, 상태, 운영 역할, 회원 등급을 가진다.

### `social_accounts`

Google 계정과 내부 회원의 연결이다. `(provider, provider_user_id)`가 유일하므로 같은 Google 계정으로 재로그인해도 회원이 중복 생성되지 않는다.

### `spring_session`, `spring_session_attributes`

로그인 세션을 저장한다. Render가 정지·재배포되어도 DB 세션을 다시 읽을 수 있다. 만료시간은 30일이다.

초기 배포에서는 자동 설정이 JDBC 저장소를 선택하지 않아 세션 행이 생성되지 않았다. commit `7348837`부터 JDBC 저장소를 명시적으로 활성화했으며 실제 HTTP 요청이 DB 행을 생성하는 자동 테스트를 포함한다. 운영에서는 최신 배포 후 `spring_session` 행 생성과 재기동 후 로그인 유지를 최종 확인한다.

### `learning_progress`

단어별 암기 여부, 방향별 정답·오답 수, 최근 결과와 최근 학습 시각을 저장한다. 기본키에 `user_id`가 포함되어 회원별로 격리된다.

### `day_sessions`

Day 학습 완료와 방향별 최고 점수를 저장한다. `(user_id, content_id)`가 기본키다.

### Flyway 변경 순서

| 버전 | 내용 |
| --- | --- |
| V1 | `users`, `social_accounts` |
| V2 | `membership_tier` |
| V3 | JDBC HTTP 세션 테이블 |
| V4 | `learning_progress`, `day_sessions` |

운영 DB 스키마는 애플리케이션 시작 시 Flyway가 순서대로 적용한다. 이미 적용된 migration 파일은 수정하지 않고 항상 새 버전을 추가한다.

## 6. 주요 요청 흐름

### Google 로그인

```text
로그인 버튼
→ Render `/oauth2/authorization/google`
→ Google 로그인/동의
→ Render OAuth callback
→ Google `sub`로 social_accounts 조회
→ 최초면 users와 social_accounts 생성
→ Neon에 Spring Session 저장
→ 브라우저에 SESSION 쿠키 발급
```

### 회원 콘텐츠 조회

```text
React가 `/api/me` 조회
→ authenticated이면 회원용 WordRepository 선택
→ `/api/content/english/days` 요청
→ 서버가 SESSION → 내부 회원 → membership_tier 확인
→ 허용된 Day 인덱스만 반환
→ 선택 Day JSON 반환
```

### 현재 수동 학습 기록 동기화

```text
IndexedDB 기록
→ 사용자가 "이 기기 → 서버" 선택
→ CSRF 토큰 발급
→ PUT /api/sync
→ 해당 user_id의 기존 snapshot을 트랜잭션으로 교체
```

다운로드는 반대 방향이며, 서버 snapshot을 받은 뒤 IndexedDB의 두 테이블을 하나의 Dexie 트랜잭션으로 교체한다.

## 7. 환경변수와 비밀값

Render에만 다음 값을 Secret으로 저장한다.

- `DB_URL`: Neon JDBC URL
- `DB_USERNAME`, `DB_PASSWORD`: Neon DB 인증정보
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: Google OAuth 인증정보

저장소의 `render.yaml`에는 변수 이름만 있고 실제 값은 없다. 비밀번호와 전체 연결 문자열은 Git, 문서, 채팅에 남기지 않는다.

## 8. 운영 특성과 장애 구분

- Render 무료 서버는 15분간 요청이 없으면 정지하며 첫 요청에 약 30~60초가 걸릴 수 있다.
- Neon도 유휴 시 compute가 정지하지만 재개 지연은 보통 Render보다 짧다.
- 첫 화면과 로그인이 모두 느리면 Render 콜드 스타트일 가능성이 높다.
- 서버가 깨어 있을 때 OAuth 시작 응답은 약 0.3초로 확인됐다.
- GitHub Pages 비회원 화면에는 Render 콜드 스타트가 없다.
- `/actuator/health`가 `UP`이면 Spring과 기본 DB 기동은 정상이다.

## 9. 다음 변경 방향

현재 가장 중요한 후속 작업은 사용자가 방향을 선택하지 않아도 되는 자동 동기화다.

1. 공식 사용자 주소를 Render로 통일하고 GitHub Pages는 데모·검증용으로 표시한다.
2. 최초 로그인 때만 같은 Render origin의 로컬/서버 기록 존재 여부를 비교한다.
3. 로컬만 있으면 업로드 동의를 받고 서버만 있으면 자동 다운로드한다.
4. 양쪽 모두 있으면 안전한 병합 선택을 제공한다.
5. 이후 IndexedDB에 먼저 저장하고 서버로 백그라운드 전송한다.
6. 레코드 버전, 수정 시각과 요청 멱등키로 여러 기기 충돌과 중복 증가를 막는다.
7. 현재 수동 방향 버튼은 설정의 복구 기능으로 이동한다.

Day 51~100은 유료 대상이므로 공개 Git 저장소에 원본을 추가하지 않는다. 결제와 콘텐츠가 준비될 때 비공개 저장소 또는 private object storage 구조를 먼저 확정한다.

## 10. 빠른 상태 확인 SQL

```sql
SELECT version, description, success
FROM flyway_schema_history
ORDER BY installed_rank;

SELECT id, email, status, role, membership_tier
FROM users
ORDER BY id;

SELECT COUNT(*) FROM spring_session;
SELECT COUNT(*) FROM learning_progress;
SELECT COUNT(*) FROM day_sessions;
```

운영 데이터의 이메일, 세션 속성, 비밀번호나 OAuth 비밀값은 화면 캡처나 채팅으로 공유하지 않는다.
