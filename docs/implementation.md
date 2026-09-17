# Implementation

## 1. Architecture

AIDIX — modular monolith с отдельным lightweight generation worker из той же codebase. Весь application stack запускается через Docker. Единственная внешняя инфраструктурная зависимость, которая не поднимается Compose-файлом, — S3-compatible object storage, подключаемый через ENV.

```text
Browser
  -> Caddy (Docker)
    -> Next.js web (Docker)
       -> PostgreSQL (Docker)
       -> external S3-compatible storage (ENV)
       -> payment provider
       -> Kie.ai callback endpoint
    -> worker (Docker, no public port)
       -> PostgreSQL
       -> external S3-compatible storage
       -> Kie.ai API

migrate (Docker one-shot)
  -> PostgreSQL
```

Нет отдельного REST API application: browser взаимодействует с Next.js Server Actions/Route Handlers. Public integration API не является product requirement.

Kie.ai — canonical image-generation gateway AIDIX. В MVP приложение не вызывает OpenAI, fal.ai, Replicate или другие model providers напрямую.

Frontend-часть Next.js строго следует Feature-Sliced Design. FSD применяется только к frontend composition/UI; server-side application/domain/infrastructure code живёт в отдельной `src/server` boundary и не маскируется под FSD slices.

## 2. Repository structure

```text
src/
  app/
    (marketing)/
    (auth)/
    app/
    api/
      webhooks/
        kie/
        yookassa/
  1_app/
  2_pages/
  3_widgets/
  4_features/
  5_entities/
  6_shared/
    ui/
    lib/
    config/
  server/
    core/
      generation/
      credits/
      payments/
      storage/
    infrastructure/
      db/
      ai/
        kie/
      storage/
      payments/
worker/
  index.ts
prisma/
  schema.prisma
  migrations/
```

`src/app` — framework-owned Next.js App Router adapter layer. Route/layout files в нём должны быть тонкими: metadata, params, composition и вызов server adapters. Product UI и client behavior не складываются непосредственно в route directories.

`src/server/core` не импортирует Next.js, React, Prisma client, Kie HTTP client implementation, AWS SDK или payment SDK.

### Strict FSD frontend

Canonical FSD layers:

```text
1_app -> 2_pages -> 3_widgets -> 4_features -> 5_entities -> 6_shared
```

Числовые префиксы обязательны. Они одновременно фиксируют dependency order и предотвращают конфликт FSD `pages` layer с Next.js legacy Pages Router.

Responsibilities:

- `1_app` — providers, client-side app composition, global app initialization;
- `2_pages` — page-level compositions, которые импортируются route files из `src/app`;
- `3_widgets` — переиспользуемые крупные UI-блоки; слой optional и создаётся только при реальной необходимости;
- `4_features` — пользовательские действия/use-cases: create project, configure generation, purchase credits и т.п.;
- `5_entities` — UI representation и model helpers бизнес-сущностей: project, generation, asset, credit balance;
- `6_shared` — truly generic UI/lib/config без product-specific business semantics. shadcn/ui source primitives располагаются в `src/6_shared/ui`.

Import rules:

- слой импортирует только нижележащие FSD layers;
- slices одного слоя не импортируют друг друга напрямую;
- каждый slice предоставляет минимальный explicit public API, обычно через `index.ts`;
- wildcard barrel exports запрещены;
- внутри slice использовать relative imports, между slices — absolute aliases;
- root-level generic folders `components`, `hooks`, `utils`, `helpers`, `types` запрещены как обход FSD;
- `src/app` не становится альтернативным feature/page layer;
- React/FSD code не импортирует Prisma, AWS SDK, Kie HTTP adapter, payment SDK или `src/server/infrastructure` напрямую;
- server modules не импортируют React/FSD UI.

FSD boundaries являются architecture requirement и должны проверяться lint/architecture tests, а не только code review.

## 3. Stack

Canonical stack:

- Next.js 16+ App Router;
- TypeScript strict mode;
- React;
- strict Feature-Sliced Design for Next.js frontend;
- Tailwind CSS;
- shadcn/ui;
- Bun package manager/scripts/runtime tooling;
- PostgreSQL;
- Prisma ORM/migrations;
- Better Auth;
- native `fetch`/thin HTTP client for Kie.ai API;
- AWS SDK v3 for S3-compatible storage;
- `sharp` for image validation/normalization;
- Zod for boundary validation;
- Vitest for unit/integration tests;
- Playwright for critical browser flows;
- Docker + Docker Compose for local, test-support and initial production deployment;
- Caddy as public reverse proxy/TLS terminator in initial single-host production topology.

Exact versions фиксируются lockfile; docs владеют technology/major choice, а не patch version.

### UI implementation constraint

UI реализуется **только через Tailwind CSS + shadcn/ui**.

Запрещено добавлять альтернативный UI/styling layer: MUI, Ant Design, Chakra, Mantine, Bootstrap, CSS Modules, Sass, styled-components, Emotion или отдельный custom component framework. Product components могут композиционно объединять shadcn/ui primitives и Tailwind utilities. Dependency, которую shadcn сам использует внутри сгенерированного primitive, не считается вторым UI layer, но application code не должен строить параллельную библиотеку компонентов поверх другого framework.

`globals.css` ограничен Tailwind imports, shadcn theme variables/tokens и необходимым base layer. Page/feature styling выполняется Tailwind utilities и semantic shadcn tokens.

shadcn/ui source primitives размещаются в `src/6_shared/ui`; product-specific wrapper/composition должен жить в корректном FSD slice, а не превращать `shared/ui` во второй product layer.

## 4. Authentication

Better Auth mounted under `/api/auth/*`.

MVP:

- email/password enabled;
- secure HTTP-only sessions;
- password reset before public launch;
- email verification recommended for production abuse control.

No organizations/roles in MVP.

Authorization не доверяет client-supplied user id. Server получает session user и scope-ит repositories.

## 5. Object storage

Во всех environments object storage является **внешним S3-compatible service**. AIDIX не поднимает MinIO или другой S3 server в Docker Compose.

Storage interface:

```ts
interface ObjectStorage {
  put(input: PutObjectInput): Promise<StoredObject>;
  getSignedReadUrl(key: string, ttlSeconds: number): Promise<string>;
  delete(key: string): Promise<void>;
}
```

Canonical DB field — opaque `storageKey`.

Key example:

```text
users/<user-id>/projects/<project-id>/assets/<asset-id>/original.webp
```

Never include email or original filename in key.

Browser upload strategy MVP:

- authenticated Next.js upload endpoint with hard file/body limits is the default initial path;
- presigned direct upload may replace proxy upload when measured payload/hosting limits require it;
- server validates and normalizes image before it becomes generation-ready.

Do not expose bucket as a public CDN. User reads/downloads generated assets through short-lived signed URLs or an authenticated proxy.

### Provider-readable input URLs

Kie.ai image-to-image models consume input URLs. AIDIX therefore creates short-lived signed GET URLs for normalized source/reference assets when submitting a generation task.

Requirements:

- the configured S3 endpoint/domain used in those signed URLs must be reachable from the public internet by Kie.ai;
- URLs are generated just before provider submission;
- provider-input URL TTL must comfortably cover Kie fetch time; initial target: 15–30 minutes;
- signed URLs are operational transport only and are never canonical database URLs;
- logs must redact query signatures.

If a future S3 deployment cannot expose provider-readable signed URLs, adding Kie File Upload API becomes a separate implementation decision; it is not required in MVP.

## 6. Image normalization

Use `sharp` server-side.

For source/reference input:

1. verify actual image type;
2. decode;
3. apply EXIF orientation;
4. strip metadata;
5. convert to sRGB;
6. write normalized WebP/JPEG with controlled quality;
7. limit long edge/provider payload size while preserving aspect ratio;
8. compute SHA-256 checksum.

Original can be retained for user download/future reprocessing; provider always receives normalized derivative.

## 7. Kie.ai integration

Kie.ai is the only image-generation API provider in MVP.

Base API:

```text
https://api.kie.ai
```

Task creation uses the unified endpoint:

```text
POST /api/v1/jobs/createTask
Authorization: Bearer <KIE_API_KEY>
```

Initial image-to-image model:

```text
gpt-image-2-5-sunburst-image-to-image
```

The model is configuration, not a business enum. Changing the default model requires the image benchmark defined in `docs/testing.md`.

### Application port

```ts
type ImageEditRequest = {
  sourceUrl: string;
  referenceUrls: Array<{
    role: 'STYLE' | 'FURNITURE' | 'MATERIAL';
    url: string;
  }>;
  prompt: string;
  aspectRatio: 'auto' | string;
  resolution: '1K' | '2K' | '4K';
  callbackUrl: string;
};

type SubmitImageEditResult = {
  providerTaskId: string;
  provider: 'kie';
  model: string;
};

interface ImageProvider {
  submitEdit(request: ImageEditRequest): Promise<SubmitImageEditResult>;
  getTask(providerTaskId: string): Promise<ImageProviderTask>;
}
```

Adapter implementation uses Kie.ai HTTP API. Domain/application services depend only on this port so tests can use a fake provider; this does not imply that multiple production providers are planned for MVP.

### Kie request mapping

For `REDESIGN_PHOTO`, the first `input_urls` element is always the normalized source room image. Optional reference assets follow in deterministic `GenerationReference.position` order.

Example provider payload shape:

```json
{
  "model": "gpt-image-2-5-sunburst-image-to-image",
  "callBackUrl": "https://aidix.example/api/webhooks/kie",
  "input": {
    "prompt": "<compiled English prompt>",
    "input_urls": [
      "<signed source URL>",
      "<signed reference URL>"
    ],
    "aspect_ratio": "auto",
    "resolution": "2K",
    "background": "opaque"
  }
}
```

Do not spread raw Kie request/response shapes through core modules. The adapter validates provider responses with Zod and maps them into internal types.

### Language

Provider-facing prompt is normalized to English. Russian user wishes remain stored as user input, while prompt compilation may translate/normalize them before provider submission. The exact translation mechanism belongs to prompt implementation and must not require a second user-visible LLM product surface.

## 8. Asynchronous generation lifecycle

Kie.ai tasks are asynchronous. HTTP `200` from `createTask` means the provider accepted a task; it does **not** mean an image exists.

Canonical flow:

1. user request transaction creates `Generation`, variants and charge;
2. worker claims a `PENDING` variant;
3. worker creates signed S3 input URLs and compiles prompt;
4. worker calls Kie `createTask` outside DB transaction;
5. successful response returns `taskId`;
6. worker persists `providerTaskId`, provider/model snapshot and keeps variant in `RUNNING`;
7. Kie calls public callback endpoint when task changes/completes;
8. callback verifies HMAC, records `providerCallbackAt`/completion hint idempotently and returns quickly;
9. worker calls Kie task-detail endpoint, obtains authoritative state/result;
10. on success worker downloads the temporary provider result, validates it, writes it to AIDIX S3, attaches `outputAssetId`, then marks variant `SUCCEEDED`;
11. on terminal provider failure worker classifies failure and settles refund;
12. parent `Generation` status is derived from variants.

A provider result URL is never the AIDIX output asset. Success is finalized only after the generated file is stored in AIDIX-owned S3.

## 9. Kie callback endpoint

Route:

```text
POST /api/webhooks/kie
```

Production must enable Kie webhook HMAC verification.

Expected headers:

```text
X-Webhook-Timestamp
X-Webhook-Signature
```

Verification rule:

```text
base64(HMAC-SHA256(taskId + "." + timestamp, KIE_WEBHOOK_HMAC_KEY))
```

Requirements:

- compare signatures in constant time;
- reject timestamps outside a small replay window (target: 5 minutes);
- resolve variant by exact `providerTaskId`;
- processing is idempotent because Kie may send repeated callbacks;
- do not trust callback result URL/body as canonical provider state;
- callback performs only verification + small DB update and returns quickly;
- image download/storage remains worker work.

The callback URL must be publicly reachable by Kie.ai.

## 10. Reconciliation polling

Callbacks optimize latency but are not the only completion mechanism.

Worker periodically reconciles `RUNNING` variants with a `providerTaskId`:

- callback-hinted variants are checked immediately/with highest priority;
- variants without callback are polled after a short delay;
- recommended polling interval target: ~30 seconds;
- stop normal polling after the configured generation timeout; initial target: 15 minutes;
- timed-out variants receive a final reconciliation attempt before failure classification.

Task detail endpoint:

```text
GET /api/v1/jobs/recordInfo?taskId=<providerTaskId>
```

This protects AIDIX against missed/failed callbacks.

## 11. Prompt construction

User wishes are one section of a controlled prompt.

Pseudo-template:

```text
Task: redesign the FIRST image, which is the user's real room.
Room type: <room>
Target style: <style recipe>

Preserve:
- camera position and perspective;
- room envelope and visible architectural openings;
- elements explicitly listed as immutable.

Change:
- furniture/finishes/decor/lighting to match requested style;
- apply user wishes where compatible.

References:
- following images are labeled by role; use them as visual guidance.

User wishes:
<normalized wishes>

Do not add text/watermarks. Produce one photorealistic interior visualization.
```

Prompt templates are versioned in code (`redesign/v1`, etc.). Changing semantics is a product change if it materially changes output contract.

## 12. Worker

Worker polls PostgreSQL rows using database locking; no Redis/message broker.

Claim transaction pattern:

```sql
SELECT ...
FOR UPDATE SKIP LOCKED
LIMIT 1;
```

Worker has two job classes inside one process initially:

- `SUBMIT_VARIANT` — submit pending variant to Kie;
- `RECONCILE_VARIANT` — query Kie state and persist terminal result into S3.

No separate distributed queue is introduced. Job intent/state is derived from persisted variant fields.

Worker concurrency controlled by ENV. Initial submission concurrency target: `2`; reconciliation may use a separate small concurrency limit.

## 13. Retry classification

Retryable examples:

- network timeout;
- Kie 429/rate limit;
- Kie 5xx;
- transient S3 failure;
- temporary failure while downloading provider result;
- missed callback when task can still be reconciled.

Terminal/user-input examples:

- invalid/corrupt source after validation edge case;
- confirmed content/policy rejection;
- unsupported image payload;
- provider task terminal failure after retry policy is exhausted.

Use exponential backoff with jitter. Store safe `errorCode`, not full upstream body.

A retry of the same product variant must not create a second credit charge. If provider task submission outcome is ambiguous, reconcile known provider identifiers where possible before creating a replacement provider task.

## 14. Credits and transactions

New eligible account receives `3` promotional credits exactly once. The ledger grant remains one idempotent `PROMO_GRANT` business operation with amount `+3`, not three independent grants.

Generation enqueue transaction:

```text
BEGIN
  lock/recalculate user balance
  ensure balance >= cost
  append GENERATION_CHARGE
  create Generation
  create N variants
COMMIT
```

External Kie call begins only after commit.

Refund is another idempotent transaction keyed by failed variant id.

## 15. Result image security

Kie-generated result URLs are temporary upstream transport and must be copied into AIDIX-owned S3 immediately after authoritative success is observed.

Do not persist provider image bytes/base64 in PostgreSQL or logs. A temporary provider URL may exist only in process memory while downloading a result; canonical persistence is `Asset.storageKey`.

Signed user-read URL TTL target: 5–15 minutes.

Image endpoints send appropriate `Content-Disposition` for downloads and `Cache-Control: private`.

## 16. Payments

Payment port:

```ts
interface PaymentProvider {
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  getPayment(providerPaymentId: string): Promise<ProviderPayment>;
  verifyWebhook(request: RawWebhookRequest): Promise<VerifiedPaymentEvent>;
}
```

Initial production adapter: ЮKassa.

Business model remains provider-neutral so another provider can be added without changing credit ledger semantics.

## 17. Docker deployment

Docker is mandatory for running the application stack. Local development should not depend on host-installed PostgreSQL, Bun service processes or MinIO.

Initial Compose services:

```text
caddy     public reverse proxy / TLS
web       Next.js standalone application
worker    generation worker
postgres  PostgreSQL
migrate   one-shot Prisma migrations
```

S3 is intentionally absent from Compose and supplied through ENV.

Production and local development use the same service boundaries; local Compose may change published ports, TLS behavior and bind mounts but not replace services with host processes.

### Images

One multi-stage `Dockerfile` should provide targets:

- `web`;
- `worker`;
- `migrate`.

Caddy and PostgreSQL use pinned upstream images in Compose.

Runtime containers:

- run as non-root where practical;
- contain production dependencies only;
- receive secrets/configuration through ENV;
- do not bake `.env` or credentials into images.

### Startup order

1. PostgreSQL becomes healthy;
2. `migrate` completes successfully;
3. `web` and `worker` start;
4. Caddy routes public traffic to `web`.

Worker/application readiness must not depend on Kie being online at boot.

## 18. Health

- `/api/health`: process liveness;
- `/api/ready`: checks PostgreSQL connectivity;
- optional S3 diagnostic is separate from liveness and must not make web process unavailable because of a transient external storage outage;
- worker heartbeat table/metric indicates last loop/claimed/reconciled job.

Kie.ai is not part of `/ready`; upstream outage should not make marketing/account pages unavailable.

## 19. Observability

Structured JSON logs with request/generation/provider task ids.

Never log:

- passwords/session tokens;
- Kie API key or webhook HMAC key;
- image base64/binary payloads;
- full signed S3 URLs;
- temporary provider result URLs;
- payment secrets;
- raw provider payload if it may contain images/personal content.

Metrics MVP:

- generation queue depth;
- provider submissions;
- Kie generation latency p50/p95;
- callback received/invalid/replayed counts;
- reconciliation poll count;
- success/partial/failure counts;
- provider error class;
- S3 error count;
- payment success/failure;
- credit refund count.

## 20. Environment

Minimum production config:

```text
# application/database
DATABASE_URL
BETTER_AUTH_SECRET
BETTER_AUTH_URL
APP_URL

# external S3-compatible storage
S3_ENDPOINT
S3_REGION
S3_BUCKET
S3_ACCESS_KEY_ID
S3_SECRET_ACCESS_KEY
S3_FORCE_PATH_STYLE=false
S3_PROVIDER_URL_TTL_SECONDS=1800
S3_USER_URL_TTL_SECONDS=600

# Kie.ai
KIE_API_BASE_URL=https://api.kie.ai
KIE_API_KEY
KIE_IMAGE_MODEL=gpt-image-2-5-sunburst-image-to-image
KIE_IMAGE_RESOLUTION=2K
KIE_WEBHOOK_HMAC_KEY
KIE_GENERATION_TIMEOUT_SECONDS=900
KIE_RECONCILE_INTERVAL_SECONDS=30

# worker
GENERATION_WORKER_CONCURRENCY=2
GENERATION_RECONCILE_CONCURRENCY=2

# payments
YOOKASSA_SHOP_ID
YOOKASSA_SECRET_KEY
```

`KIE_CALLBACK_URL` normally derives from `APP_URL + /api/webhooks/kie`; separate override is allowed only for deployment routing needs.

Secrets never use `NEXT_PUBLIC_*`.

Startup config validation fails fast when required production variables are missing or placeholder values are used.

## 21. Local development workflow

Canonical startup:

```text
docker compose up --build -d
docker compose ps
```

Development/test commands run in containers, for example:

```text
docker compose exec web bun run lint
docker compose exec web bun run typecheck
docker compose exec web bun run test
docker compose exec web bun run build
```

An external S3 test/dev bucket must be configured in `.env`. The repository must not silently create or fall back to local filesystem storage/MinIO when S3 variables are missing.

## 22. Explicit non-goals

MVP does not add:

- Redis;
- event bus;
- Kubernetes;
- vector database;
- separate LLM agent service;
- custom computer vision microservice;
- self-hosted diffusion/GPU model;
- direct OpenAI/fal.ai/Replicate generation integration;
- local MinIO/S3 container;
- separate admin backend;
- a second UI framework or styling system alongside Tailwind + shadcn/ui;
- non-FSD frontend structure such as root-level `components`, `hooks`, `utils` or `modules` used as parallel architecture.
