# Implementation

## 1. Architecture

AIDIX — modular monolith с отдельным lightweight generation worker из той же codebase. Application processes запускаются через Docker. PostgreSQL и S3-compatible storage являются внешними dependencies и подключаются через ENV.

```text
Browser
  -> Next.js web (Docker)
       -> external PostgreSQL (DATABASE_URL)
       -> external S3-compatible storage
       -> Better Auth Email OTP
       -> React Email renderer
       -> SMTP server (ENV)
       -> Robokassa
       -> Kie.ai callback endpoint

worker (Docker)
  -> external PostgreSQL
  -> external S3-compatible storage
  -> Kie.ai API

migrate (Docker one-shot)
  -> external PostgreSQL
```

Repository stack не содержит Caddy/reverse proxy, PostgreSQL или S3 containers. TLS/edge termination относится к deployment environment.

Browser взаимодействует с Next.js Server Actions/Route Handlers; отдельный public backend/API service не требуется.

Canonical external integrations:

- Kie.ai — image-generation gateway; конкретная model `TBD` до M3;
- Robokassa — payment provider;
- SMTP — transactional email transport configured by ENV, без фиксации SMTP vendor;
- external PostgreSQL and S3-compatible storage — configured by ENV.

## 2. Repository structure

```text
src/
  app/                  Next.js App Router adapters
  1_app/                FSD app layer
  2_pages/              FSD pages layer
  3_widgets/            FSD widgets layer
  4_features/           FSD features layer
  5_entities/           FSD entities layer
  6_shared/
    ui/                 shadcn/ui primitives
    lib/
    config/
  server/
    core/
      generation/
      credits/
      payments/
      storage/
      email/
    infrastructure/
      db/
      ai/kie/
      storage/
      payments/robokassa/
      email/
        templates/      React Email templates
        smtp/           SMTP transport implementation
    config/
      env/              T3 Env + Valibot server/runtime config
worker/
  index.ts
prisma/
  schema.prisma
  migrations/
```

`src/app` содержит только framework adapters: routes, layouts, metadata, route handlers и тонкую composition.

`src/server/core` не импортирует Next.js, React, Prisma client, AWS SDK, Kie/Robokassa implementations или SMTP package.

## 3. Strict FSD frontend

Dependency direction:

```text
1_app -> 2_pages -> 3_widgets -> 4_features -> 5_entities -> 6_shared
```

Rules:

- слой импортирует только нижележащие FSD layers;
- slices одного слоя не импортируют друг друга напрямую;
- каждый slice предоставляет explicit public API;
- wildcard barrel exports запрещены;
- внутри slice relative imports, между slices absolute aliases;
- root-level `components`, `hooks`, `utils`, `helpers`, `types`, `modules` запрещены;
- React/FSD code не импортирует server infrastructure напрямую;
- `3_widgets` создаётся только при фактической необходимости.

FSD boundaries должны проверяться automated architecture/lint tests.

## 4. Canonical stack

- latest stable Next.js App Router;
- TypeScript strict mode;
- React;
- React Compiler;
- strict Feature-Sliced Design;
- Tailwind CSS;
- shadcn/ui;
- Bun runtime/package manager/script runner/test runner;
- Biome formatter/linter for TypeScript/JavaScript/JSON;
- external PostgreSQL;
- Prisma ORM/migrations;
- Better Auth + Email OTP;
- React Email;
- SMTP transport configured through ENV;
- T3 Env;
- Valibot;
- Formisch (`@formisch/react`);
- native `fetch`/thin HTTP client for Kie.ai;
- AWS SDK v3 for S3-compatible storage;
- `sharp` for image validation/normalization;
- Robokassa integration;
- `bun:test` for unit/integration/architecture tests;
- Docker/Docker Compose for `web`, `worker`, `migrate`.

Do not add Zod, React Hook Form, Vitest or Jest without explicit architecture decision.

Browser E2E framework remains `TBD`; no Playwright/Cypress dependency in M0.

## 5. UI implementation

UI/styling only through Tailwind CSS + shadcn/ui.

- shadcn source primitives live in `src/6_shared/ui`;
- product-specific composition lives in proper FSD slices;
- no MUI/Ant/Chakra/Mantine/Bootstrap/CSS Modules/Sass/styled-components/Emotion;
- `globals.css` limited to Tailwind/shadcn theme/base concerns.

## 6. Forms and validation

All product forms use **Formisch + Valibot**.

Canonical pattern:

```text
Valibot schema
  -> Formisch useForm/Form/Field
  -> shadcn visual controls
  -> server action/route handler
  -> Valibot server re-validation
  -> application service
```

Rules:

- Formisch owns client form state/validation;
- Valibot schema is source of truth for form shape and validation;
- do not introduce React Hook Form/Formik;
- do not build full forms from ad-hoc `useState` validation machinery;
- shadcn controls (`Input`, `Button`, `Select`, `Textarea`, etc.) are presentation primitives only;
- do not use shadcn form wrappers that introduce React Hook Form;
- client validation is UX only; all untrusted server input is validated again with Valibot;
- feature-specific form schemas live in the feature/model boundary; only truly generic schemas belong in shared.

## 7. Environment validation

Canonical ENV layer: **T3 Env + Valibot**.

Next.js web uses `@t3-oss/env-nextjs`. Worker/migrate must consume the same validated configuration contract through an appropriate T3 Env/server config entrypoint; raw unvalidated ENV must not spread through application code.

Rules:

- direct `process.env.*` reads allowed only inside dedicated env bootstrap/config modules required to construct T3 Env runtime input;
- server/client schemas separated;
- secrets never use `NEXT_PUBLIC_*`;
- missing/malformed required variables fail fast;
- web build imports/validates the env configuration so invalid configuration fails before deployment;
- Valibot is the schema validator for ENV.

Minimum server ENV surface:

```text
# app/auth/db
DATABASE_URL
BETTER_AUTH_SECRET
BETTER_AUTH_URL
APP_URL

# SMTP
SMTP_HOST
SMTP_PORT
SMTP_SECURE
SMTP_USER
SMTP_PASSWORD
SMTP_FROM_EMAIL
SMTP_FROM_NAME

# S3
S3_ENDPOINT
S3_REGION
S3_BUCKET
S3_ACCESS_KEY_ID
S3_SECRET_ACCESS_KEY
S3_FORCE_PATH_STYLE

# Kie.ai
KIE_API_BASE_URL=https://api.kie.ai
KIE_API_KEY
KIE_IMAGE_MODEL=TBD
KIE_TEST_IMAGE_MODEL=gpt-image-2-5-sunburst-image-to-image
KIE_TEST_IMAGE_RESOLUTION=1K

# Robokassa
ROBOKASSA_MERCHANT_LOGIN
ROBOKASSA_PASSWORD_1
ROBOKASSA_PASSWORD_2
ROBOKASSA_HASH_ALGORITHM
ROBOKASSA_IS_TEST
```

Environment-specific optionality/defaults are encoded in Valibot/T3 Env schema and tests, not scattered across call sites.

## 8. Authentication

Better Auth mounted under `/api/auth/*`.

MVP is passwordless Email OTP:

1. user enters email;
2. Better Auth requests OTP delivery;
3. AIDIX renders OTP email via React Email;
4. SMTP adapter sends rendered message using validated SMTP ENV;
5. user submits code;
6. successful verification creates/opens session;
7. first eligible account receives one idempotent `PROMO_GRANT` of `+3` credits.

Rules:

- password auth/reset UI absent;
- no account enumeration in user-visible errors;
- OTP values never logged in production;
- exact OTP length/expiry/attempt limits are config concerns until explicitly documented;
- future social auth requires explicit provider decision.

## 9. Email architecture

React Email is template/rendering only. SMTP delivery is infrastructure.

Core port example:

```ts
type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

interface EmailSender {
  send(input: SendEmailInput): Promise<void>;
}
```

OTP flow:

```text
Better Auth sendVerificationOTP callback
  -> render React Email OTP template
  -> EmailSender port
  -> SMTP adapter
  -> configured SMTP server
```

Rules:

- templates live under server email infrastructure/presentation boundary, not FSD frontend;
- SMTP transport package is replaceable and must be isolated inside `infrastructure/email/smtp`;
- domain/application code does not know SMTP library API;
- SMTP credentials are T3 Env server variables only;
- normal tests use fake EmailSender and do not open network connections;
- rendered templates must not include internal secrets beyond the intended OTP/user-facing data.

## 10. Object storage

All environments use external S3-compatible storage; no MinIO/local filesystem fallback.

```ts
interface ObjectStorage {
  put(input: PutObjectInput): Promise<StoredObject>;
  getSignedReadUrl(key: string, ttlSeconds: number): Promise<string>;
  delete(key: string): Promise<void>;
}
```

Canonical DB field is opaque `storageKey`.

Object keys never include email or original filenames. Bucket is private. User/provider access uses short-lived signed URLs.

The same `S3_ENDPOINT` is used for S3 operations and signed read URLs. Development and production provide different values through their respective environment configuration. A live external-provider smoke test therefore requires the configured endpoint to be publicly reachable by that provider.

Input images are validated/normalized server-side with `sharp`: decode, EXIF orientation, metadata strip, sRGB, size limit, checksum.

## 11. Kie.ai integration

Kie.ai is the only generation gateway MVP.

```text
KIE_IMAGE_MODEL=TBD
```

Owner-approved test profile:

```text
model: gpt-image-2-5-sunburst-image-to-image
resolution: 1K
```

This profile is approved for opt-in contract/smoke tests only and does not approve the production model or production resolution. Production remains `TBD` until the M3 decision is recorded.

The owner-approved test profile uses Kie's documented `POST /api/v1/jobs/createTask` contract with `model`, `callBackUrl`, and `input` fields. The image-to-image input uses `prompt`, `input_urls`, `aspect_ratio`, `resolution`, and `background`; the accepted response maps `data.taskId` to the internal provider task id. Task reconciliation uses Kie's `recordInfo` endpoint. This contract is used only for the approved test profile; production model remains `TBD`.

Application port remains provider-shape-neutral:

```ts
type ImageEditRequest = {
  sourceUrl: string;
  referenceUrls: Array<{ role: 'STYLE' | 'FURNITURE' | 'MATERIAL'; url: string }>;
  prompt: string;
  callbackUrl: string;
  options?: Record<string, string | number | boolean>;
};

interface ImageProvider {
  submitEdit(request: ImageEditRequest): Promise<{ providerTaskId: string; provider: 'kie'; model: string }>;
  getTask(providerTaskId: string): Promise<ImageProviderTask>;
}
```

Provider responses and callbacks are validated with Valibot before mapping to internal types.

## 12. Generation lifecycle

Generation is asynchronous.

1. transaction creates `Generation`, N variants and credit charge;
2. worker claims pending variant;
3. signed S3 inputs + compiled prompt prepared;
4. Kie call occurs outside DB transaction;
5. provider task id stored;
6. variant remains running until authoritative result;
7. callback is completion hint where supported;
8. worker reconciles provider state where supported;
9. successful result downloaded, validated and copied to AIDIX S3;
10. only then variant becomes `SUCCEEDED`;
11. terminal provider/system failures settle idempotent refund;
12. parent status derived from variants.

Temporary Kie URLs are never canonical assets.

## 13. Worker

Worker uses external PostgreSQL as durable queue/state; no Redis/message broker.

Claim pattern uses PostgreSQL locking such as `FOR UPDATE SKIP LOCKED` where appropriate.

Logical jobs:

- submit pending generation variant;
- reconcile running provider task;
- persist output/refund terminal failure.

Retries use exponential backoff + jitter and never create a second product credit charge.

## 14. Credits

One `REDESIGN_PHOTO` variant costs `1 credit`.

```text
cost = requestedVariants * 1
```

New eligible account receives one idempotent `PROMO_GRANT` with `amountSigned = +3`.

Generation enqueue transaction atomically verifies balance, appends charge, creates generation/variants, commits, then external work begins.

Provider/system terminal failure creates a separate refund ledger entry.

## 15. Robokassa

Robokassa-specific signatures/credentials remain inside `src/server/infrastructure/payments/robokassa`.

Canonical rules:

- server creates persisted `Payment`/purchase snapshot before checkout;
- browser cannot choose trusted amount/catalog values;
- `ResultURL` is authoritative server notification;
- signature and amount/invoice are verified before success;
- credit grant idempotent;
- `SuccessURL`/`FailURL` are navigation only and never grant credits.

Paid catalog, prices, currency and fiscal settings remain `TBD` until M6 owner decision.

## 16. Docker deployment

Canonical Compose services:

```text
web
worker
migrate
```

Production PostgreSQL/S3/SMTP servers and the reverse proxy are external and configured through ENV/deployment configuration. No Caddy/Nginx is included in the production repository stack.

Development may use `compose.dev.yml` with disposable PostgreSQL, MinIO, and Mailpit services. These services are development-only compatibility dependencies and are never required by the production deployment. The development Compose file also runs `web`, `worker`, and the one-shot `migrate` process against those dependencies.

Development startup uses `prisma db push` against the disposable database because development migrations are not committed as production migration history. Production `migrate` continues to run `prisma migrate deploy` against committed migrations.

Development startup:

```text
docker compose -f compose.dev.yml up --build
```

Development endpoints are the Next.js app at `http://localhost:3000`, MinIO API at `http://localhost:19000`, MinIO console at `http://localhost:19001`, and Mailpit UI at `http://localhost:18025`. Development credentials and service endpoints are supplied by Compose overrides; production secrets must never be copied into the Compose file.

One multi-stage Dockerfile should expose `web`, `worker`, `migrate` targets.

Runtime containers:

- run Bun;
- run non-root where practical;
- contain production dependencies only;
- receive secrets via ENV;
- never bake `.env` into image.

Startup:

1. external PostgreSQL reachable;
2. migrate succeeds;
3. web/worker start.

## 17. Health and observability

- `/api/health`: process liveness;
- `/api/ready`: external PostgreSQL connectivity;
- S3/SMTP/Kie/Robokassa diagnostics are dependency-specific and not basic liveness.

Never log session tokens, OTP values, SMTP password, Kie/Robokassa secrets, signed S3 URLs, private image bytes or raw provider payloads containing user content.

Useful metrics include generation queue/latency/statuses, provider errors, S3 failures, OTP send/verify outcomes, SMTP send failures, payment outcomes/refunds.

## 18. Testing/runtime workflow

Canonical runner is `bun:test`.

```text
bun run lint
bun run typecheck
bun test
bun run build
```

Normal CI uses fake Kie/Robokassa/SMTP/storage adapters where real external compatibility is not under test.

Dedicated integration tests use explicitly configured external test PostgreSQL/S3/SMTP endpoints only when required.

Browser E2E tool remains `TBD` until M3–M4 checkpoint.

## 19. Explicit non-goals

MVP does not add:

- Redis/event bus/Kubernetes/vector DB;
- separate backend service;
- local PostgreSQL/MinIO/S3 in production;
- Caddy/reverse proxy container;
- password auth;
- direct OpenAI/fal.ai/Replicate integration;
- self-hosted GPU inference;
- Zod as parallel schema stack;
- React Hook Form/Formik as parallel form stack;
- Vitest/Jest;
- Playwright/Cypress before explicit E2E decision;
- second UI framework/styling system;
- non-FSD root architecture.
