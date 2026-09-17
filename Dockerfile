FROM oven/bun:1.4.0 AS base
WORKDIR /app

FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM deps AS build
COPY . .
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
