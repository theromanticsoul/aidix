# AIDIX

AIDIX — веб-сервис для AI-визуализации интерьера. Пользователь загружает фотографию реального помещения, указывает тип комнаты, стиль, пожелания и при необходимости референсы, после чего получает несколько вариантов обновлённого интерьера.

Главная ценность продукта — не «нарисовать красивую комнату с нуля», а быстро показать, как **конкретное существующее пространство** может выглядеть после ремонта: с сохранением ракурса, основных границ помещения и неизменяемых элементов настолько, насколько это позволяет генеративная модель.

AIDIX помогает:

- до ремонта сравнить несколько визуальных направлений;
- сформировать понятный референс для семьи, дизайнера или подрядчика;
- примерить стиль, материалы, мебель и цветовую гамму;
- быстро получить несколько концепций без полноценного 3D-проектирования.

AIDIX не является CAD/BIM-системой и не заменяет рабочий дизайн-проект, точный обмер, инженерные расчёты, смету или строительную документацию.

## MVP

Первый релиз сфокусирован на одном завершённом сценарии:

1. Пользователь входит по одноразовому коду, отправленному на email, и получает **3 бесплатные генерации** (`3 promotional credits`) при первом eligible account.
2. Создаёт проект комнаты.
3. Загружает фотографию помещения.
4. Выбирает тип комнаты и стиль.
5. При необходимости добавляет текстовые пожелания и до трёх референсов.
6. Запускает генерацию.
7. Получает 1–4 варианта, сравнивает их с исходной фотографией и сохраняет понравившийся.
8. Может запустить новую вариацию с изменёнными настройками.

Один generated variant расходует один credit. Поэтому стартовые 3 promotional credits дают три одиночных результата либо могут быть израсходованы на multi-variant request по одному credit на каждый requested variant.

В MVP **не входят** точная генерация планировки, 3D-сцена, автоматическая смета, подбор товаров из магазинов и инженерные рекомендации. Они описаны в roadmap как отдельные будущие модули.

## Документация

Каждая область имеет один нормативный источник:

| Документ | Владеет |
| --- | --- |
| [Product](docs/product.md) | Ценность продукта, scope, пользовательские сценарии, генерационные режимы и ограничения. |
| [Domain](docs/domain.md) | Сущности, lifecycle, invariants, credits и ownership. |
| [Implementation](docs/implementation.md) | Архитектура, стек, FSD frontend, auth/email, ENV, forms, AI integration, storage, jobs, security и deployment. |
| [UI](docs/ui.md) | IA, landing, auth, forms, generator, result flow, states, responsive semantics и SEO surface. |
| [Billing](docs/billing.md) | Credit ledger, Robokassa integration, payment lifecycle и refunds. |
| [Testing](docs/testing.md) | Quality gates, Bun tests, ENV/email/form contracts, architecture checks и release verification. |
| [Roadmap](docs/roadmap.md) | Порядок реализации, acceptance gates и future modules. |
| [Research](docs/research.md) | Ненормативный срез конкурентов и внешних технологий на дату исследования. |
| [Progress](docs/progress.md) | Ненормативный handoff между LLM/coding sessions. |
| [AGENTS.md](AGENTS.md) | Правила разработки LLM, Specification Lock, Decision hygiene, FSD boundaries и обязательный workflow. |

`docs/research.md` и `docs/progress.md` не задают product requirements и не могут переопределять canonical documents.

## Основные технические решения

AIDIX — небольшой modular monolith. Next.js frontend строго использует Feature-Sliced Design; framework routing и server-side application code не смешиваются с frontend slices.

```text
src/
  app/           Next.js App Router: thin routes/layouts/route handlers only
  1_app/         FSD application composition/providers
  2_pages/       FSD page compositions
  3_widgets/     FSD reusable page blocks, only when justified
  4_features/    FSD user interactions/use-cases
  5_entities/    FSD business entities for UI
  6_shared/      FSD shared UI/lib/config; shadcn primitives live here
  server/
    core/        application/domain services without React/Next dependencies
    infrastructure/
      db/        Prisma/PostgreSQL adapters
      storage/   S3-compatible object storage
      ai/kie/    Kie.ai adapter
      payments/  Robokassa adapter behind payment port
      email/     React Email renderer + SMTP transport boundary
worker/
  generation worker из той же codebase
prisma/
  schema.prisma
  migrations/
```

FSD dependency direction: `1_app -> 2_pages -> 3_widgets -> 4_features -> 5_entities -> 6_shared`. Frontend slices импортируют только нижележащие слои; slices одного слоя не импортируют друг друга и предоставляют минимальный explicit public API.

Начальный stack:

- latest stable Next.js App Router + TypeScript;
- React Compiler;
- React + **Tailwind CSS + shadcn/ui как единственный UI/styling layer**;
- strict Feature-Sliced Design для frontend-части Next.js;
- **Bun как runtime, package manager, script runner и test runner**;
- production использует внешний PostgreSQL через `DATABASE_URL`; development допускает disposable PostgreSQL в `compose.dev.yml`;
- Prisma ORM и migrations;
- Better Auth + Email OTP для passwordless входа;
- **React Email** для OTP и других transactional email templates;
- отправка email через SMTP; SMTP host/credentials/from-address задаются только через ENV, конкретный SMTP transport package является replaceable implementation detail;
- **T3 Env + Valibot** для типизированной валидации ENV;
- **Formisch + Valibot** для пользовательских форм;
- Valibot является canonical schema validation library; Zod/React Hook Form не входят в stack без отдельного решения;
- social auth — future capability, конкретные providers `TBD`;
- production использует внешний S3-compatible object storage для source/reference/generated images через ENV; development допускает disposable MinIO в `compose.dev.yml`;
- **Kie.ai** как единственный image-generation API gateway MVP; конкретная image model — `TBD` до owner decision перед M3;
- **Robokassa** как production payment provider MVP;
- Biome как formatter/linter для TypeScript/JavaScript/JSON;
- Docker Compose как обязательный способ запуска AIDIX application processes (`web`, `worker`, `migrate`); production dependencies остаются вне Compose, а development dependencies описаны в `compose.dev.yml`;
- отдельный reverse proxy/Caddy в repository stack не используется;
- unit/integration/architecture tests выполняются через `bun:test`; browser E2E tool пока `TBD`, Playwright не является зависимостью M0.

Redis, Kubernetes, отдельный API service, message broker, production PostgreSQL/MinIO containers, прямые OpenAI/fal.ai/Replicate integrations и собственный GPU inference в MVP не используются. Disposable PostgreSQL/MinIO/Mailpit разрешены только для development в `compose.dev.yml`.

Для локальной разработки с disposable dependencies:

```bash
docker compose -f compose.dev.yml up --build
```

## Главный продуктовый invariant

Пользователь должен понимать разницу между визуальной концепцией и рабочим проектом. UI никогда не обещает точное соблюдение размеров или строительную реализуемость результата.
