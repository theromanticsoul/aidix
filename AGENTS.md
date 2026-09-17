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

## Обязательные источники

Перед изменением поведения читать `README.md`, затем документ-владелец:

- `docs/product.md` — scope, features, generation semantics;
- `docs/domain.md` — entities/lifecycle/invariants;
- `docs/implementation.md` — stack и technical boundaries;
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

Не создавать отдельный backend только ради «правильной архитектуры». Next.js является BFF/web application; domain services располагаются вне route handlers и могут вызываться из server actions/route handlers/worker.

Framework-facing код должен быть тонким:

```text
HTTP/UI adapter -> application service -> repository/provider ports -> infrastructure adapters
```

Business rules запрещено дублировать в React components, route handlers и Prisma queries.

## Module boundaries

Предпочтительная структура:

```text
src/modules/<module>/
  model/       domain types, state machines, invariants
  service/     application use cases
  repository/  ports/interfaces
  ui/          module-owned UI composition
```

Cross-module imports идут через минимальный public API. Не создавать глобальные `utils.ts`, `helpers.ts`, `types.ts` как свалки.


## UI implementation rules

- UI и styling выполняются только через Tailwind CSS + shadcn/ui.
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

External Kie/payment calls в обычном CI не выполняются. Использовать contract fixtures/fake adapters; отдельный opt-in smoke test может обращаться к Kie/платёжному sandbox. S3 integration test использует явно настроенный внешний test bucket, а не MinIO container.

## Progress handoff

`docs/progress.md` хранит:

- current milestone;
- одну `IN_PROGRESS` task максимум;
- completed verification;
- blockers;
- next concrete action.

Progress не меняет requirements и не используется как аргумент против canonical docs.
