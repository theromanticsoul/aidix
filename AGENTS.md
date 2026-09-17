# Контекст разработки AIDIX

## Продукт

AIDIX — AI-сервис визуализации интерьера по фотографии реального помещения. Продукт оптимизируется под быстрый путь от исходного фото до нескольких визуальных концепций ремонта.

Цель MVP — качественно решить сценарий `photo -> room/style/preferences -> generated variants -> compare/save`, а не построить универсальную архитектурную CAD-платформу.

## Принципы

- Сначала законченный photo-redesign MVP, затем editing/upscale/plan/3D.
- Не добавлять абстракции ради гипотетического масштаба.
- PostgreSQL — единственная operational database MVP, но AIDIX не поднимает PostgreSQL container: подключение выполняется через `DATABASE_URL`.
- Не добавлять Redis, Kafka, Kubernetes, микросервисы, local PostgreSQL или local MinIO/S3 container без explicit product/architecture decision.
- Изображения хранятся во внешнем S3-compatible object storage, а не в PostgreSQL. S3 не поднимается Docker Compose и подключается через ENV.
- Kie.ai — единственный production image-generation API gateway MVP. Domain model не содержит Kie/model names как business enums; adapter detail остаётся в infrastructure layer.
- Robokassa — payment provider MVP; payment/credit domain остаётся отделён от provider-specific signature/redirect semantics.
- Better Auth + Email OTP — auth mechanism MVP. Password auth не используется. Production email-delivery provider остаётся `TBD` до explicit owner decision.
- Future social auth допускается только после explicit выбора конкретных providers владельцем продукта.
- Bun — runtime, package manager, script runner и test runner проекта.
- Credit списывается за продуктовую операцию, а не за upstream token/image accounting.
- Любая генерация может завершиться ошибкой; credits не должны теряться из-за подтверждённой provider/system failure.
- Generated image — визуальная концепция, а не точная строительная документация.
- Frontend-часть Next.js строго следует Feature-Sliced Design. Нарушение FSD boundaries считается architecture defect, а не stylistic preference.

## Decision hygiene

LLM/разработчик **не имеет права додумывать существенные product/business/infrastructure решения**, которых нет в canonical docs или explicit owner message.

К таким решениям относятся, в частности:

- payment/provider vendor;
- AI/model/provider vendor;
- hosting/cloud vendor;
- S3 vendor;
- email/SMS provider;
- social auth providers;
- analytics/observability vendor;
- prices, package sizes, quotas и скидки;
- tax/VAT/fiscal receipt semantics;
- retention periods;
- legal/privacy promises;
- auth methods beyond documented set;
- browser E2E framework/tool;
- new external SaaS dependency;
- irreversible schema/product constraints.

Если такое значение не утверждено, canonical representation — `TBD`. Во время planning/docs task агент должен явно отметить missing decision владельцу. Во время implementation task агент должен остановить affected scope или реализовать provider-neutral boundary без выбора конкретного vendor, если это безопасно и не меняет product semantics.

Нельзя выбирать «наиболее популярный», «логичный» или знакомый сервис и затем закреплять его в документации как принятое решение.

Внешние factual details уже выбранного vendor можно уточнять по его актуальной официальной документации, но это не даёт права самостоятельно выбрать vendor.

## Обязательные источники

Перед изменением поведения читать `README.md`, затем документ-владелец:

- `docs/product.md` — scope, features, generation semantics;
- `docs/domain.md` — entities/lifecycle/invariants;
- `docs/implementation.md` — stack, FSD frontend и technical boundaries;
- `docs/ui.md` — screens/flows/states/SEO;
- `docs/billing.md` — credits/payments;
- `docs/testing.md` — gates/verification;
- `docs/roadmap.md` — execution order.

`docs/research.md` и `docs/progress.md` — reference/handoff only.

## Specification Lock

Canonical docs — source of truth для implementation.

Во время обычной задачи `implement`, `fix`, `refactor`, `test`, `migration` canonical docs находятся в read-only mode. Ошибка реализации, неудобство API или падающий тест не являются основанием переписать требование.

Если код и docs расходятся:

1. Считать documented behavior целевым.
2. Исправить код или тест.
3. Если requirement противоречив или practically impossible — зафиксировать конфликт для владельца продукта.
4. Не ослаблять requirement молча.

Semantic docs update разрешён, когда владелец продукта явно просит изменить/уточнить product, UX или architecture decision.

Порядок semantic change:

```text
owner decision
-> canonical docs update
-> implementation
-> tests
-> progress update
```

## Development shape

AIDIX — один repository и одна product codebase. AIDIX application processes запускаются через Docker Compose; host-process mode не является canonical development path. PostgreSQL и S3 являются внешними dependencies и подключаются через ENV. Отдельный Caddy/reverse-proxy container в repository stack не используется.

Canonical Compose services:

```text
web
worker
migrate
```

Не создавать отдельный backend только ради «правильной архитектуры». Next.js является BFF/web application; server-side domain/application services располагаются вне React/FSD slices и могут вызываться из Server Actions/Route Handlers/worker.

Framework-facing код должен быть тонким:

```text
Next route/action adapter -> server application service -> repository/provider ports -> infrastructure adapters
```

Business rules запрещено дублировать в React components, route handlers и Prisma queries.

## Strict Feature-Sliced Design

Frontend Next.js реализуется строго по FSD.

Canonical frontend structure:

```text
src/
  app/            Next.js App Router adapters: routes, layouts, route handlers
  1_app/          FSD app layer: providers, app composition, global client setup
  2_pages/        FSD page compositions imported by Next route files
  3_widgets/      FSD reusable large UI blocks; optional until needed
  4_features/     FSD user interactions/use-cases
  5_entities/     FSD business entities represented in UI
  6_shared/       FSD shared UI/lib/config; shadcn primitives live here
  server/         server-only application/domain/infrastructure code
```

Числовые префиксы обязательны: они сохраняют порядок FSD и не конфликтуют с Next.js legacy `pages` router.

Dependency direction:

```text
1_app -> 2_pages -> 3_widgets -> 4_features -> 5_entities -> 6_shared
```

Rules:

- слой может импортировать только нижележащие FSD layers;
- slices одного слоя не импортируют друг друга напрямую;
- каждый slice имеет минимальный explicit public API, обычно через `index.ts`;
- wildcard barrel exports запрещены;
- внутри slice использовать relative imports, между slices — configured absolute aliases;
- `src/app` не является местом product logic: route/layout files только подключают `1_app`/`2_pages`, metadata и server adapters;
- `3_widgets` не создавать «на всякий случай»; widget появляется только для реально переиспользуемой крупной композиции;
- `6_shared` не содержит product-specific business semantics;
- не создавать параллельные каталоги `components/`, `hooks/`, `utils/`, `helpers/`, `types/` вне корректного FSD slice/layer;
- React/FSD slices не импортируют Prisma client, AWS SDK, Kie/Robokassa implementation или `src/server/infrastructure` напрямую;
- server-only modules не импортируют React/FSD page/feature/entity UI.

Любое отступление от этих правил требует explicit architecture decision владельца и docs-first update.

## Server module boundaries

Server-side код FSD не заменяет и не смешивает с frontend slices.

Предпочтительная структура:

```text
src/server/
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
```

`server/core` не импортирует Next.js, React, Prisma client, Kie HTTP implementation, AWS SDK, Robokassa-specific implementation или конкретный email-provider SDK.

## Authentication rules

- MVP auth — passwordless email OTP через Better Auth.
- Не добавлять password sign-in/sign-up UI или password reset flow в MVP.
- Production email provider — `TBD`; до выбора vendor использовать provider-neutral email boundary/fake adapter в tests.
- Никогда не логировать OTP в production logs.
- Первый eligible подтверждённый account получает один idempotent `PROMO_GRANT` на `+3` credits.
- Social login является future capability; конкретные providers не выбирать самостоятельно.

## UI implementation rules

- UI и styling выполняются только через Tailwind CSS + shadcn/ui.
- shadcn source primitives располагаются в `src/6_shared/ui`.
- Не добавлять MUI, Ant Design, Chakra, Mantine, Bootstrap, CSS Modules, Sass, styled-components, Emotion или второй component framework.
- Product-owned components должны композиционно использовать shadcn primitives и Tailwind utilities.
- `globals.css` содержит только Tailwind/shadcn theme/base concerns, не page-specific styling.
- Не создавать параллельный custom design-system package поверх shadcn без explicit owner decision.

## AI generation rules

- `Generation` создаётся до external provider call.
- Credit reservation выполняется atomically с созданием Generation.
- Kie provider call никогда не выполняется внутри DB transaction.
- Worker обязан быть idempotent по generation/variant id. Kie callback также обрабатывается idempotently по `providerTaskId`.
- Retry не должен повторно списывать credit.
- Kie `createTask` success означает только принятую async task. Variant становится `SUCCEEDED` только после authoritative Kie task success и копирования результата во внешний AIDIX S3.
- Если provider returned success, но сохранение output не завершилось, generation остаётся retryable и credit не возвращается до окончательного failure decision.
- Не хранить временный Kie result URL как canonical output URL. Callback служит completion hint; worker обязан уметь reconcile task через Kie task-detail API при потерянном callback.
- Не логировать raw private images, base64 payloads или API keys.

## Image prompt ownership

Prompt template принадлежит product code и versioned как `promptVersion`. User prompt не отправляется напрямую как полный provider prompt.

Application формирует structured prompt из:

- operation type;
- room type;
- style recipe;
- immutable constraints;
- user wishes;
- reference roles;
- safety/realism instructions.

Каждая generation хранит `promptVersion`, provider/model snapshot и safe normalized settings, чтобы можно было расследовать regression.

## Data/privacy rules

- Source/reference/generated images private by default.
- Object keys не содержат email/имя пользователя.
- Signed GET URLs короткоживущие.
- Bucket не public.
- Account deletion удаляет product metadata и ставит owned objects в deletion queue/cleanup path.
- Public gallery не входит в MVP.

## Billing rules

- Новый eligible account получает ровно `3` promotional credits один раз; UI представляет их как три бесплатные генерации.
- Robokassa `ResultURL` является authoritative server payment notification surface; `SuccessURL` сам по себе не подтверждает платёж.
- Баланс определяется append-only `CreditLedgerEntry`, а не mutable `user.credits` как единственным source of truth.
- Можно иметь cached balance, но ledger остаётся canonical.
- Payment notification processing идемпотентно по internal payment/invoice identity.
- Successful payment начисляет credits ровно один раз.
- Generation failure refund создаёт отдельную ledger entry; исходное списание не удаляется.
- Catalog structure, package sizes и цены остаются `TBD` до explicit owner decision перед M6.

## Testing discipline

Canonical test runner — `bun:test`. Не добавлять Vitest/Jest без explicit architecture decision.

До handoff обязательны:

```text
bun run lint
bun run typecheck
bun test
bun run build
```

Integration suites также запускаются через Bun test runner; допустим отдельный script вроде `bun run test:integration`, если он лишь выбирает соответствующий набор `bun test` tests.

Browser E2E framework пока `TBD`. Playwright не является dependency/gate M0. Перед browser E2E implementation должен быть отдельный owner/architecture checkpoint; до этого не добавлять Playwright/Cypress и не обещать cross-browser coverage.

Architecture/lint checks должны ловить запрещённые FSD imports и не позволять постепенно обходить FSD через generic root-level folders.

External Kie/Robokassa calls в обычном CI не выполняются. Использовать contract fixtures/fake adapters; отдельный opt-in smoke test может обращаться к Kie и Robokassa test mode. S3 integration test использует явно настроенный внешний test bucket, а не MinIO container. Database integration tests используют явно настроенный внешний test PostgreSQL через ENV, а не PostgreSQL container.

## Progress handoff

`docs/progress.md` хранит:

- current milestone;
- одну `IN_PROGRESS` task максимум;
- completed verification;
- blockers;
- next concrete action.

Progress не меняет requirements и не используется как аргумент против canonical docs.
