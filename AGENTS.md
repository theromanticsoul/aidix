# Контекст разработки AIDIX

## Продукт

AIDIX — AI-сервис визуализации интерьера по фотографии реального помещения. Цель MVP — качественно решить сценарий `photo -> room/style/preferences -> generated variants -> compare/save`, а не построить универсальную CAD/3D-платформу.

## Принципы

- Сначала законченный photo-redesign MVP, затем editing/upscale/plan/3D.
- PostgreSQL — единственная operational database MVP, но подключается только через `DATABASE_URL`; локальный PostgreSQL container не поднимается.
- S3-compatible storage внешний и подключается через ENV; MinIO/local S3 не поднимается.
- Kie.ai — единственный image-generation API gateway MVP; конкретная model остаётся `TBD` до owner decision перед M3.
- Robokassa — payment provider MVP.
- Better Auth + Email OTP — auth mechanism MVP. Password auth не используется.
- React Email — canonical layer для transactional email templates.
- React Compiler включён для React-кода.
- Email отправляется через SMTP, конфигурация SMTP задаётся ENV. SMTP transport package — replaceable infrastructure detail и не должен протекать в domain/application code.
- T3 Env + Valibot — canonical ENV validation layer.
- Formisch + Valibot — canonical frontend form layer.
- Valibot — canonical schema-validation library проекта; не добавлять Zod без explicit architecture decision.
- Bun — runtime, package manager, script runner и test runner.
- Biome — canonical formatter/linter для TypeScript/JavaScript/JSON.
- Frontend Next.js строго следует Feature-Sliced Design.
- UI/styling строго Tailwind CSS + shadcn/ui.
- Credit списывается за продуктовую операцию, а не за upstream provider accounting.
- Generated image — визуальная концепция, а не строительная документация.

## Decision hygiene

LLM/разработчик **не имеет права додумывать существенные product/business/infrastructure решения**, которых нет в canonical docs или explicit owner message.

К таким решениям относятся payment/AI/hosting/S3/analytics vendors, social auth providers, Kie model, prices/packages/discounts, tax/VAT/fiscal semantics, retention, legal/privacy promises, browser E2E framework и необратимые schema/product constraints.

Если значение не утверждено, canonical representation — `TBD`. Нельзя выбирать «популярный» или знакомый сервис и фиксировать его как принятое решение.

Replaceable implementation package внутри уже утверждённой boundary можно выбрать во время implementation, если это не меняет product semantics и не создаёт vendor lock-in. В частности SMTP transport library может быть выбрана реализацией, но SMTP contract/ENV и React Email templates остаются canonical.

## Обязательные источники

Перед изменением поведения читать `README.md`, затем документ-владелец:

- `docs/product.md` — scope/features/generation semantics;
- `docs/domain.md` — entities/lifecycle/invariants;
- `docs/implementation.md` — stack/FSD/auth/ENV/forms/infrastructure;
- `docs/ui.md` — screens/flows/forms/states/SEO;
- `docs/billing.md` — credits/payments;
- `docs/testing.md` — gates/verification;
- `docs/roadmap.md` — execution order.

`docs/research.md` и `docs/progress.md` — reference/handoff only.

## Specification Lock

Canonical docs — source of truth. Во время обычной задачи `implement`, `fix`, `refactor`, `test`, `migration` требования не ослаблять ради удобства реализации.

Semantic change order:

```text
owner decision
-> canonical docs update
-> implementation
-> tests
-> progress update
```

## Development shape

AIDIX — один repository и одна product codebase. Canonical Compose services:

```text
web
worker
migrate
```

PostgreSQL и S3 внешние. Caddy/reverse-proxy container отсутствует.

Framework-facing код должен быть тонким:

```text
Next route/action adapter -> server application service -> repository/provider ports -> infrastructure adapters
```

Business rules запрещено дублировать в React components, route handlers и Prisma queries.

## Strict Feature-Sliced Design

Canonical frontend structure:

```text
src/
  app/            Next.js App Router adapters only
  1_app/          providers/app composition
  2_pages/        page compositions
  3_widgets/      reusable large UI blocks when justified
  4_features/     user interactions/use-cases
  5_entities/     business UI entities
  6_shared/       shared UI/lib/config
  server/         server-only application/domain/infrastructure
```

Dependency direction:

```text
1_app -> 2_pages -> 3_widgets -> 4_features -> 5_entities -> 6_shared
```

Rules:

- слой импортирует только нижележащие FSD layers;
- slices одного слоя не импортируют друг друга напрямую;
- каждый slice имеет минимальный explicit public API;
- wildcard barrel exports запрещены;
- внутри slice relative imports, между slices absolute aliases;
- `src/app` содержит только routing/layout/metadata/server-adapter composition;
- root-level `components`, `hooks`, `utils`, `helpers`, `types`, `modules` запрещены как parallel architecture;
- React/FSD code не импортирует Prisma/AWS SDK/Kie/Robokassa/SMTP infrastructure напрямую;
- server-only modules не импортируют React/FSD UI.

## Server boundaries

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
      templates/
      smtp/
```

`server/core` не импортирует Next.js, React, Prisma client, provider SDKs или SMTP package.

## Environment rules

- ENV читается только через типизированный T3 Env layer.
- Application code не читает `process.env` напрямую, кроме dedicated env bootstrap/config module where T3 Env requires it.
- Valibot schemas используются для ENV validation.
- Next.js web использует `@t3-oss/env-nextjs`; worker/migrate должны получать эквивалентно типизированную/валидированную server configuration из той же canonical schema family.
- Server/client ENV boundaries разделены; секреты никогда не объявляются как `NEXT_PUBLIC_*`.
- Build/start должен fail fast на отсутствующих required variables.
- Для server-only variables предпочтительно отдельное server env schema/module, чтобы client code не получал server configuration surface.

Canonical SMTP ENV surface:

```text
SMTP_HOST
SMTP_PORT
SMTP_SECURE
SMTP_USER
SMTP_PASSWORD
SMTP_FROM_EMAIL
SMTP_FROM_NAME
```

Конкретные значения environment-specific и не коммитятся.

## Authentication and email rules

- MVP auth — passwordless email OTP через Better Auth.
- OTP email template рендерится React Email.
- React Email отвечает за template/rendering; SMTP adapter отвечает только за delivery.
- SMTP credentials доступны только server-side через validated env layer.
- Не добавлять password UI/reset flow.
- Не логировать OTP, SMTP password или rendered email с sensitive content в production.
- Tests используют fake email sender/transport и не требуют живого SMTP.
- Первый eligible account получает один idempotent `PROMO_GRANT` на `+3` credits.
- Social login future-only; providers не выбирать самостоятельно.

## Forms and validation rules

- Пользовательские React forms реализуются через **Formisch (`@formisch/react`) + Valibot**.
- Не добавлять React Hook Form/Formik или второй form-state framework без explicit decision.
- Не собирать полноценную форму вручную из множества `useState`/самописной validation state machine.
- Valibot schema является source of truth для структуры/валидации формы; TypeScript types выводятся из schema там, где это возможно.
- Formisch field/form state располагается в корректном FSD feature/page slice, а не в `shared`.
- shadcn `Input`, `Button`, `Select`, `Textarea` и другие primitives используются как visual controls; не использовать shadcn Form abstractions, которые требуют React Hook Form.
- Client validation улучшает UX, но не является security boundary: server action/route handler повторно валидирует untrusted input Valibot schema перед application service.
- Общие schema выносить в shared только если они действительно не содержат product-specific semantics.

## UI implementation rules

- UI/styling только Tailwind CSS + shadcn/ui.
- shadcn primitives располагаются в `src/6_shared/ui`.
- Не добавлять MUI, Ant Design, Chakra, Mantine, Bootstrap, CSS Modules, Sass, styled-components, Emotion.
- `globals.css` содержит только Tailwind/shadcn theme/base concerns.

## AI generation rules

- `Generation` создаётся до external provider call.
- Credit reservation atomic с созданием Generation.
- Provider call не выполняется внутри DB transaction.
- Worker и callbacks idempotent.
- Retry не списывает credit повторно.
- Provider result становится success только после сохранения output в AIDIX S3.
- Temporary provider URL не является canonical output.
- Не логировать private images/base64/API keys.

## Billing rules

- Новый eligible account получает ровно `3` promotional credits один раз.
- Robokassa `ResultURL` — authoritative server payment notification; `SuccessURL` сам по себе не подтверждает платёж.
- Credit ledger append-only и canonical.
- Successful payment начисляет credits ровно один раз.
- Failure refund — отдельная ledger entry.
- Paid catalog/prices/currency/fiscal settings `TBD` до owner decision перед M6.

## Testing discipline

Canonical test runner — `bun:test`. Не добавлять Vitest/Jest без explicit decision.

До handoff:

```text
bun run lint
bun run typecheck
bun test
bun run build
```

Architecture tests ловят FSD violations, forbidden imports, raw `process.env` reads вне env module, React Hook Form/Zod dependencies и обход Formisch/Valibot conventions.

External Kie/Robokassa/SMTP calls в обычном CI не выполняются. Database/S3 integration uses explicit external test ENV only.

Browser E2E framework пока `TBD`; Playwright не является dependency M0.

## Git / commit discipline

На текущем solo-development этапе canonical workflow — **direct commits to `main`**. Feature branches и pull requests не являются обязательными и не должны создаваться только ради процесса.

Branch/PR workflow вводится отдельным owner decision, когда появляется хотя бы один из факторов:

- второй разработчик или внешний contributor;
- обязательный code review;
- protected-branch/required-CI policy;
- параллельная работа над несколькими конфликтующими задачами;
- release process, где изоляция изменений реально снижает риск.

До этого момента агент/разработчик коммитит напрямую в `main` и соблюдает следующие правила.

### Commit format

Использовать Conventional Commits-style prefixes:

```text
feat:      новая пользовательская/системная возможность
fix:       исправление дефекта
refactor:  изменение структуры без смены поведения
test:      тесты без product behavior change
docs:      документация
chore:     housekeeping/tooling без production behavior change
build:     build/dependency/container changes
ci:        CI configuration
```

Commit message пишется на английском, кратко и предметно, например:

```text
feat: add email otp authentication
fix: prevent duplicate promo credit grant
refactor: isolate smtp transport adapter
docs: define direct-to-main commit discipline
```

Не использовать бессодержательные сообщения вроде `update`, `changes`, `fix stuff`, `wip`, `misc`.

### Atomicity

- Один commit = одна логически завершённая change.
- Не смешивать несвязанные feature/fix/refactor/formatting изменения в одном commit.
- Не создавать искусственно много микрокоммитов для одной неделимой change только ради количества.
- Если semantic owner decision требует docs update + implementation, docs должны быть обновлены до implementation; они могут быть отдельным предшествующим commit или частью того же логически атомарного change, если история остаётся понятной.
- Prisma migration коммитится вместе с соответствующим `schema.prisma` change и кодом, который от неё зависит.
- `bun.lock`/lockfile коммитится вместе с dependency change.
- Generated files коммитятся только если repository contract действительно требует их version control.

### Safety

Никогда не коммитить:

- `.env`/local secret files;
- API keys, SMTP credentials, database passwords, auth/session secrets;
- production/user data dumps;
- temporary generated assets/logs;
- editor/OS artifacts, если они не являются осознанной частью repository contract.

Не использовать `--no-verify` для обхода установленных hooks/checks. Не переписывать уже опубликованную историю `main` через force-push/rebase без explicit owner instruction.

### Verification before commit/handoff

Для маленького commit допускается запуск только релевантных быстрых проверок перед самим commit, чтобы сохранить быстрый цикл разработки. Но change не считается завершённой, если соответствующие проверки падают.

Перед завершением task/handoff обязательно:

```text
bun run lint
bun run typecheck
bun test
bun run build
```

Если change затрагивает migration, external integration contract или architecture boundaries, дополнительно запускается релевантный integration/architecture suite из `docs/testing.md`.

`docs/progress.md` обновляется при завершении текущей milestone/task или когда меняются blocker/next action; не делать отдельный progress commit после каждого маленького технического commit без полезного handoff-смысла.

## Progress handoff

`docs/progress.md` хранит current milestone, одну active task максимум, verification, blockers и next action. Progress не меняет requirements.
