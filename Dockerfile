FROM oven/bun:1.4.0 AS base
WORKDIR /app

FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM deps AS build
COPY . .
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build \
    BETTER_AUTH_SECRET=build-only-secret-that-is-at-least-32-chars \
    BETTER_AUTH_URL=http://localhost:3000 \
    APP_URL=http://localhost:3000 \
    SMTP_HOST=localhost \
    SMTP_PORT=1025 \
    SMTP_SECURE=false \
    SMTP_USER=build \
    SMTP_PASSWORD=build \
    SMTP_FROM_EMAIL=build@example.com \
    SMTP_FROM_NAME=AIDIX \
    S3_ENDPOINT=http://localhost:9000 \
    S3_REGION=us-east-1 \
    S3_BUCKET=build \
    S3_ACCESS_KEY_ID=build \
    S3_SECRET_ACCESS_KEY=build \
    S3_FORCE_PATH_STYLE=true \
    KIE_API_BASE_URL=https://api.kie.ai \
    KIE_API_KEY=build \
    KIE_IMAGE_MODEL=TBD \
    ROBOKASSA_MERCHANT_LOGIN=build \
    ROBOKASSA_PASSWORD_1=build \
    ROBOKASSA_PASSWORD_2=build \
    ROBOKASSA_HASH_ALGORITHM=sha256 \
    ROBOKASSA_IS_TEST=true
RUN bunx --bun prisma generate
RUN bun run build

FROM base AS web
ENV NODE_ENV=production
COPY --from=build /app ./
EXPOSE 3000
CMD ["bun", "run", "start"]

FROM base AS worker
ENV NODE_ENV=production
COPY --from=build /app ./
CMD ["bun", "run", "worker"]

FROM base AS migrate
COPY --from=deps /app ./
COPY prisma ./prisma
COPY prisma.config.ts ./
CMD ["bun", "run", "db:migrate"]
