# Implementation

## 1. Architecture

AIDIX — modular monolith с отдельным lightweight generation worker из той же codebase. AIDIX application processes запускаются через Docker. PostgreSQL и S3-compatible object storage являются внешними dependencies и подключаются через ENV; AIDIX не поднимает для них containers.

```text
Browser
  -> Next.js web (Docker)
       -> external PostgreSQL (DATABASE_URL)
       -> external S3-compatible storage (ENV)
       -> Better Auth Email OTP
       -> transactional email provider (TBD)
       -> Robokassa payment interface / ResultURL
       -> Kie.ai callback endpoint

worker (Docker, no public port)
  -> external PostgreSQL
  -> external S3-compatible storage
  -> Kie.ai API

migrate (Docker one-shot)
  -> external PostgreSQL
```

AIDIX repository stack не содержит Caddy/reverse-proxy container. TLS/reverse proxy/edge termination относится к deployment environment и не фиксируется в этой спецификации до отдельного owner decision.

Нет отдельного REST API application: browser взаимодействует с Next.js Server Actions/Route Handlers. Public integration API не является product requirement.

Kie.ai — canonical image-generation gateway AIDIX. Конкретная image model внутри Kie.ai не выбрана и остаётся `TBD` до explicit owner decision перед M3. В MVP приложение не вызывает OpenAI, fal.ai, Replicate или другие model providers напрямую.

Robokassa — canonical payment provider MVP. Payment/credit domain остаётся отделён от provider-specific signature and redirect semantics.

Better Auth + Email OTP — canonical authentication mechanism MVP. Production transactional email provider не выбран и остаётся `TBD`.

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
      payments/
        robokassa/
          result/
          success/
          fail/
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
      email/
    infrastructure/
      db/
      ai/
        kie/
      storage/
      payments/
        robokassa/
      email/
worker/
  index.ts
prisma/
  schema.prisma
  migrations/
```

`src/app` — framework-owned Next.js App Router adapter layer. Route/layout files в нём должны быть тонкими: metadata, params, composition и вызов server adapters. Product UI и client behavior не складываются непосредственно в route directories.

`src/server/core` не импортирует Next.js, React, Prisma client, Kie HTTP client implementation, AWS SDK, Robokassa-specific implementation или конкретный email-provider SDK.

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
- `4_features` — пользовательские действия/use-cases: sign in by OTP, create project, configure generation, purchase credits и т.п.;
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
- React/FSD code не импортирует Prisma, AWS SDK, Kie/Robokassa infrastructure adapters или `src/server/infrastructure` напрямую;
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
- **Bun runtime, package manager, script runner and test runner**;
- external PostgreSQL configured by `DATABASE_URL`;
- Prisma ORM/migrations;
- Better Auth with Email OTP plugin;
- production transactional email provider: `TBD`;
- native `fetch`/thin HTTP client for Kie.ai API;
- AWS SDK v3 for S3-compatible storage;
- `sharp` for image validation/normalization;
- Zod for boundary validation;
- Robokassa payment integration via signed payment interface and ResultURL;
- `bun:test` for unit/integration/architecture tests;
- Docker + Docker Compose for AIDIX application processes (`web`, `worker`, `migrate`).

Playwright/Cypress/another browser E2E framework is **not selected yet**. No browser E2E package is added in M0. Decision checkpoint is documented in `docs/testing.md`/`docs/roadmap.md`.

Exact versions фиксируются lockfile; docs владеют technology/major choice, а не patch version.

### UI implementation constraint

UI реализуется **только через Tailwind CSS + shadcn/ui**.

Запрещено добавлять альтернативный UI/styling layer: MUI, Ant Design, Chakra, Mantine, Bootstrap, CSS Modules, Sass, styled-components, Emotion или отдельный custom component framework. Product components могут композиционно объединять shadcn/ui primitives и Tailwind utilities. Dependency, которую shadcn сам использует внутри сгенерированного primitive, не считается вторым UI layer, но application code не должен строить параллельную библиотеку компонентов поверх другого framework.

`globals.css` ограничен Tailwind imports, shadcn theme variables/tokens и необходимым base layer. Page/feature styling выполняется Tailwind utilities и semantic shadcn tokens.

shadcn/ui source primitives размещаются в `src/6_shared/ui`; product-specific wrapper/composition должен жить в корректном FSD slice, а не превращать `shared/ui` во второй product layer.

## 4. Authentication

Better Auth mounted under `/api/auth/*`.

MVP authentication is passwordless Email OTP:

1. user submits email;
2. Better Auth Email OTP flow requests a sign-in OTP;
3. AIDIX passes delivery through a provider-neutral email sender boundary;
4. user submits OTP;
5. successful verification creates/opens session;
6. first eligible account receives one idempotent `PROMO_GRANT` of `+3` credits.

Rules:

- password auth is disabled/not exposed in MVP;
- no password reset flow in MVP;
- production email provider is `TBD` and must not be inferred;
- tests use a fake email sender capable of capturing OTP without external delivery;
- production logs never contain OTP values;
- exact OTP length/expiry/attempt limits remain Better Auth/config concerns and are not product promises until explicitly configured/documented;
- future social login is allowed only after explicit selection of concrete providers.

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

Kie.ai is the only image-generation API gateway in MVP.

Base API:

```text
https://api.kie.ai
```

Task creation uses the Kie jobs API. Exact request mapping depends on the **owner-approved model** selected before M3.

Canonical model state:

```text
KIE_IMAGE_MODEL=TBD
```

Do not implement or document one Kie model as canonical until the owner explicitly selects it. Candidate models may be benchmarked in research, but research does not change this requirement.

### Application port

```ts
type ImageEditRequest = {
  sourceUrl: string;
  referenceUrls: Array<{
    role: 'STYLE' | 'FURNITURE' | 'MATERIAL';
    url: string;
  }>;
  prompt: string;
  aspectRatio?: string;
  quality?: string;
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

Adapter implementation uses Kie.ai HTTP API. Domain/application services depend only on this port so tests can use a fake provider; this does not imply that multiple production gateways are planned for MVP.

### Kie request mapping

Model-specific path/payload fields are defined only after model selection. The invariant mapping for `REDESIGN_PHOTO` is:

- normalized source room image is the primary image input;
- optional reference assets follow in deterministic `GenerationReference.position` order if the chosen model supports them;
- prompt is compiled by AIDIX;
- callback/public completion URL is supplied when supported/required by the chosen Kie model API;
- model-specific option names never leak into domain types unnecessarily.

Do not spread raw Kie request/response shapes through core modules. The adapter validates provider responses with Zod and maps them into internal types.

### Language

Provider-facing prompt may be normalized to the language that benchmarks best for the selected model. Russian user wishes remain stored as user input. Exact translation/normalization mechanism belongs to prompt implementation and must not require a second user-visible LLM product surface unless explicitly approved.

## 8. Asynchronous generation lifecycle

Kie.ai generation is treated as asynchronous. Provider task acceptance does **not** mean an image exists.

Canonical flow:

1. user request transaction creates `Generation`, variants and charge;
2. worker claims a `PENDING` variant;
3. worker creates signed S3 input URLs and compiles prompt;
4. worker calls Kie outside DB transaction;
5. successful submission returns/stores provider task identity;
6. worker persists `providerTaskId`, provider/model snapshot and keeps variant in `RUNNING`;
7. provider callback, when available, acts as completion hint;
8. callback handling is idempotent and returns quickly;
9. worker queries authoritative provider task state when the selected Kie API supports task-detail reconciliation;
10. on success worker downloads temporary provider result, validates it, writes it to AIDIX S3, attaches `outputAssetId`, then marks variant `SUCCEEDED`;
11. on terminal provider failure worker classifies failure and settles refund;
12. parent `Generation` status is derived from variants.

A provider result URL is never the AIDIX output asset. Success is finalized only after the generated file is stored in AIDIX-owned S3.

Exact callback signature/headers/task-detail endpoint are model/API-contract details to be finalized against current Kie documentation after model selection; they must not be guessed.

## 9. Reconciliation and callbacks

Callbacks optimize latency but are not trusted as the sole durable state transition when the selected Kie API exposes task lookup.

Requirements after model selection:

- callback processing idempotent by provider task id;
- callback/body verification follows current Kie contract exactly;
- callback never directly stores external result URL as canonical output;
- worker can reconcile `RUNNING` provider tasks through the selected Kie task-detail API where available;
- timeout/retry policy is configuration and benchmark-driven rather than a product promise.

## 10. Prompt construction

User wishes are one section of a controlled prompt.

Pseudo-template:

```text
Task: redesign the primary image, which is the user's real room.
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
- following reference images are labeled by role; use them as visual guidance when supported by the selected model.

User wishes:
<normalized wishes>

Do not add text/watermarks. Produce one photorealistic interior visualization.
```

Prompt templates are versioned in code (`redesign/v1`, etc.). Changing semantics is a product change if it materially changes output contract.

## 11. Worker

Worker polls external PostgreSQL rows using database locking; no Redis/message broker.

Claim transaction pattern:

```sql
SELECT ...
FOR UPDATE SKIP LOCKED
LIMIT 1;
```

Worker has two logical job classes inside one process initially:

- `SUBMIT_VARIANT` — submit pending variant to Kie;
- `RECONCILE_VARIANT` — reconcile provider state and persist terminal result into S3.

No separate distributed queue is introduced. Job intent/state is derived from persisted variant fields.

Worker concurrency controlled by ENV. Concrete concurrency defaults may be introduced during implementation after observing provider/database limits; do not present guessed values as product requirements.

## 12. Retry classification

Retryable examples:

- network timeout;
- provider rate limit;
- provider 5xx/transient failure;
- transient S3 failure;
- transient external PostgreSQL connectivity failure where transaction safety is preserved;
- temporary failure while downloading provider result;
- missed callback when provider task can still be reconciled.

Terminal/user-input examples:

- invalid/corrupt source after validation edge case;
- confirmed content/policy rejection;
- unsupported image payload;
- provider task terminal failure after retry policy is exhausted.

Use exponential backoff with jitter. Store safe `errorCode`, not full upstream body.

A retry of the same product variant must not create a second credit charge. If provider task submission outcome is ambiguous, reconcile known provider identifiers where possible before creating a replacement provider task.

## 13. Credits and transactions

New eligible account receives `3` promotional credits exactly once after successful first OTP authentication. The ledger grant remains one idempotent `PROMO_GRANT` business operation with amount `+3`, not three independent grants.

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

## 14. Result image security

Kie-generated result URLs are temporary upstream transport and must be copied into AIDIX-owned S3 immediately after authoritative success is observed.

Do not persist provider image bytes/base64 in PostgreSQL or logs. A temporary provider URL may exist only in process memory while downloading a result; canonical persistence is `Asset.storageKey`.

Signed user-read URL TTL is configuration, not product semantics.

Image endpoints send appropriate private caching/download headers.

## 15. Robokassa payments

Robokassa is the production payment provider for MVP. Domain code must not know signature formulas, merchant credentials or Robokassa URL/query shapes.

Paid catalog/package sizes/prices are `TBD`; checkout implementation must consume only approved persisted purchase definitions and must not invent commercial values.

### Internal payment port

```ts
type CheckoutInput = {
  paymentId: string;
  invoiceId: number;
  amount: string;
  description: string;
};

type CheckoutResult = {
  url: string;
  method: 'GET' | 'POST';
  fields: Record<string, string>;
};

type VerifiedPaymentNotification = {
  invoiceId: number;
  amount: string;
};

interface PaymentProvider {
  createCheckout(input: CheckoutInput): Promise<CheckoutResult>;
  verifyResultNotification(input: RawPaymentNotification): Promise<VerifiedPaymentNotification>;
}
```

Adapter: `src/server/infrastructure/payments/robokassa`.

### Checkout and ResultURL

Robokassa payment request includes provider-required merchant/login, amount, invoice and signature fields. `InvId` maps to a stable AIDIX internal payment/invoice identity. Checkout signature is calculated inside the adapter using server-only Robokassa credentials and the merchant-configured hash algorithm.

AIDIX must not trust amount/catalog data coming back from the browser. Server constructs checkout from persisted `Payment` and immutable purchase snapshot.

Canonical ResultURL route:

```text
POST /api/payments/robokassa/result
```

ResultURL processing:

1. parse provider fields;
2. load internal `Payment` by stable invoice id;
3. reconstruct/verify provider signature using server-only credentials;
4. reject mismatched signature;
5. compare received amount with persisted expected amount;
6. idempotently transition eligible `Payment` to `SUCCEEDED`;
7. append exactly one purchase credit-grant ledger entry;
8. return the acknowledgement required by Robokassa.

Repeated valid notifications for an already succeeded payment must not grant credits twice.

### SuccessURL / FailURL

User-facing routes:

```text
/api/payments/robokassa/success
/api/payments/robokassa/fail
```

They are navigation/UX surfaces only and never grant credits directly.

### Credentials and secrets

Robokassa credentials are server-only. No Robokassa secret uses `NEXT_PUBLIC_*`.

Exact currency, receipt/fiscalization/tax parameters are **TBD until owner/legal/merchant configuration is explicitly decided**. Implementation must not invent them.

## 16. Docker deployment

Docker is mandatory for AIDIX application processes. Local development should not depend on host-run Bun application processes.

Canonical Compose services:

```text
web       Next.js application running with Bun project runtime/toolchain
worker    generation worker running with Bun
migrate   one-shot Prisma migrations
```

PostgreSQL and S3 are intentionally absent from Compose and supplied through ENV.

No Caddy/reverse-proxy service is part of the repository deployment topology.

### Images

One multi-stage `Dockerfile` should provide targets:

- `web`;
- `worker`;
- `migrate`.

Runtime containers:

- run as non-root where practical;
- use Bun as the project runtime/package toolchain;
- contain production dependencies only;
- receive secrets/configuration through ENV;
- do not bake `.env` or credentials into images.

### Startup order

1. external PostgreSQL must be reachable;
2. `migrate` completes successfully against `DATABASE_URL`;
3. `web` and `worker` start.

Worker/application readiness must not depend on Kie, Robokassa, S3 or email provider being online at boot beyond explicit route/use-case requirements. Database connectivity is required for readiness.

## 17. Health

- `/api/health`: process liveness;
- `/api/ready`: checks external PostgreSQL connectivity;
- optional S3 diagnostic is separate from liveness;
- optional email-provider diagnostic is separate from liveness;
- worker heartbeat table/metric indicates last loop/claimed/reconciled job.

Kie.ai, Robokassa, S3 and email provider are not part of basic `/ready`; upstream outage should not make marketing pages unavailable. Auth/generation/payment operations should surface dependency-specific failures.

## 18. Observability

Structured JSON logs with request/generation/provider task/payment ids.

Never log:

- session tokens;
- OTP values in production;
- Kie API key or other Kie secrets;
- Robokassa secrets;
- email-provider secrets;
- image base64/binary payloads;
- full signed S3 URLs;
- temporary provider result URLs;
- raw provider payload if it may contain images/personal content.

Metrics MVP:

- generation queue depth;
- provider submissions;
- generation latency p50/p95;
- callback/reconciliation counts where supported by selected Kie model API;
- success/partial/failure counts;
- provider error class;
- S3 error count;
- payment success/failure;
- invalid payment notification count;
- duplicate payment notification count;
- OTP send/verify success/failure counters without storing OTP values;
- credit refund count.

## 19. Environment

Minimum production config:

```text
# application/database
DATABASE_URL
BETTER_AUTH_SECRET
BETTER_AUTH_URL
APP_URL

# transactional email
# provider/vendor-specific variables: TBD after owner selects provider

# external S3-compatible storage
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
# other model-specific options: defined only after model selection

# Robokassa
ROBOKASSA_MERCHANT_LOGIN
ROBOKASSA_PASSWORD_1
ROBOKASSA_PASSWORD_2
ROBOKASSA_HASH_ALGORITHM
ROBOKASSA_IS_TEST
```

Secrets never use `NEXT_PUBLIC_*`.

Startup config validation fails fast for variables required by the process/use-case being started. A production environment cannot enable Email OTP sign-in until an approved production email provider is configured. Generation cannot be enabled until `KIE_IMAGE_MODEL` is explicitly selected/configured.

## 20. Local development workflow

Canonical startup:

```text
docker compose up --build -d
docker compose ps
```

Development/test commands run in containers, for example:

```text
docker compose exec web bun run lint
docker compose exec web bun run typecheck
docker compose exec web bun test
docker compose exec web bun run build
```

External PostgreSQL and S3 test/dev endpoints must be configured in `.env`. The repository must not silently create or fall back to local PostgreSQL, filesystem storage or MinIO when variables are missing.

Normal automated tests use fakes where external services are unnecessary. Dedicated integration tests may use explicitly configured external test PostgreSQL/S3 resources.

Robokassa test mode is used for opt-in external payment integration testing; normal CI uses deterministic fixtures/fake adapter and never depends on live provider availability.

## 21. Explicit non-goals

MVP does not add:

- Redis;
- event bus;
- Kubernetes;
- vector database;
- separate LLM agent service;
- custom computer vision microservice;
- self-hosted diffusion/GPU model;
- direct OpenAI/fal.ai/Replicate generation integration;
- local PostgreSQL container;
- local MinIO/S3 container;
- Caddy/reverse-proxy container in repository stack;
- password authentication;
- an unapproved transactional email vendor;
- unapproved social auth providers;
- unapproved Kie image model;
- Vitest/Jest as project test runner;
- Playwright/Cypress until browser E2E tool decision is explicitly made;
- separate admin backend;
- a second UI framework or styling system alongside Tailwind + shadcn/ui;
- non-FSD frontend structure such as root-level `components`, `hooks`, `utils` or `modules` used as parallel architecture.
