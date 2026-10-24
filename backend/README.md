# Voca 3000 Backend

Spring Boot API server for authentication and learning-data synchronization.

## Requirements

- Java 17+
- Docker (for the local PostgreSQL container)

## Local verification

```bash
./gradlew test
```

## Local database

```bash
docker compose up -d
./gradlew bootRun
```

The default local database credentials are development-only values from
`compose.yaml`. Production credentials must be supplied through environment
variables.

## Runtime profiles

- `local` is the default profile and connects to the local PostgreSQL instance.
- `prod` requires `DB_URL`, `DB_USERNAME`, and `DB_PASSWORD`; it has no fallback
  credentials.
- Tests use the isolated H2 configuration in `src/test/resources/application.yml`.

Start the production profile only after providing its environment variables:

```bash
SPRING_PROFILES_ACTIVE=prod ./gradlew bootRun
```

## Google OAuth login

Create a Google OAuth web client with this local redirect URI:

```text
http://localhost:8080/login/oauth2/code/google
```

Copy `.env.example` to the ignored `.env`, set `GOOGLE_CLIENT_ID` and
`GOOGLE_CLIENT_SECRET`, then export the file into the current shell before
starting both local and OAuth profiles:

```bash
set -a
source .env
set +a
./gradlew bootRun --args='--spring.profiles.active=local,oauth-google'
```

Start login at `http://localhost:8080/oauth2/authorization/google`. Do not commit
the client secret or place it in frontend environment variables.
