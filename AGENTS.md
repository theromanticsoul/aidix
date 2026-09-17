# Контекст разработки AIDIX

## Продукт

AIDIX — AI-сервис визуализации интерьера по фотографии реального помещения. Продукт оптимизируется под быстрый путь от исходного фото до нескольких визуальных концепций ремонта.

Цель MVP — качественно решить сценарий `photo -> room/style/preferences -> generated variants -> compare/save`, а не построить универсальную архитектурную CAD-платформу.

## Принципы

- Сначала законченный photo-redesign MVP, затем editing/upscale/plan/3D.
- Не добавлять абстракции ради гипотетического масштаба.
- PostgreSQL — единственная обязательная operational database MVP.
- Не добавлять Redis, Kafka, Kubernetes, микросервисы или local MinIO/S3 container без explicit product/architecture decision.
- Изображения хранятся во внешнем S3-compatible object storage, а не в PostgreSQL. S3 не поднимается Docker Compose и подключается через ENV.
- Kie.ai — единственный production image-generation API gateway MVP. Domain model не содержит Kie/model names как business enums; adapter detail остаётся в infrastructure layer.
- Credit списывается за продуктовую операцию, а не за upstream token/image accounting.
- Любая генерация может завершиться ошибкой; credits не должны теряться из-за подтверждённой provider/system failure.
- Generated image — визуальная концепция, а не точная строительная документация.
- Frontend-часть Next.js строго следует Feature-Sliced Design. Нарушение FSD boundaries считается architecture defect, а не stylistic preference.

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

AIDIX — один repository и одна product codebase. Весь application stack запускается через Docker Compose; host-process mode не является canonical development path. Единственное исключение — внешний S3-compatible service из ENV.

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
- React/FSD slices не импортируют Prisma client, AWS SDK, Kie client, payment SDK или `src/server/infrastructure` напрямую;
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
  infrastructure/
    db/
    ai/kie/
    storage/
    payments/
```

`server/core` не импортирует Next.js, React, Prisma client, Kie HTTP implementation, AWS SDK или payment SDK.

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
- Баланс определяется append-only `CreditLedgerEntry`, а не mutable `user.credits` как единственным source of truth.
- Можно иметь cached balance, но ledger остаётся canonical.
- Payment webhook идемпотентен по provider event/payment id.
- Successful payment начисляет credits ровно один раз.
- Generation failure refund создаёт отдельную ledger entry; исходное списание не удаляется.

## Testing discipline

До handoff обязательны:

```text
bun run lint
bun run typecheck
bun run test
bun run test:integration
bun run build
```

Если затронут browser flow, добавить/обновить Playwright coverage.

Architecture/lint checks должны ловить запрещённые FSD imports и не позволять постепенно обходить FSD через generic root-level folders.

External Kie/payment calls в обычном CI не выполняются. Использовать contract fixtures/fake adapters; отдельный opt-in smoke test может обращаться к Kie/платёжному sandbox. S3 integration test использует явно настроенный внешний test bucket, а не MinIO container.

## Progress handoff

`docs/progress.md` хранит:

- current milestone;
- одну `IN_PROGRESS` task максимум;
- completed verification;
- blockers;
- next concrete action.

Progress не меняет requirements и не используется как аргумент против canonical docs.
