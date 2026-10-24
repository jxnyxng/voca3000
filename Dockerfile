FROM node:24-alpine AS frontend-build
WORKDIR /workspace/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN VITE_AUTH_ENABLED=true npm run build

FROM eclipse-temurin:17-jdk-jammy AS backend-build
WORKDIR /workspace/backend
COPY backend/ ./
COPY frontend/public/data/ /workspace/frontend/public/data/
COPY --from=frontend-build /workspace/frontend/dist/ src/main/resources/static/
RUN ./gradlew clean bootJar --no-daemon

FROM eclipse-temurin:17-jre-jammy
WORKDIR /app
COPY --from=backend-build /workspace/backend/build/libs/*.jar app.jar
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75.0"
EXPOSE 10000
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
