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
