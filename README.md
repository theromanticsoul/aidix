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

1. Пользователь регистрируется и получает **3 бесплатные генерации** (`3 promotional credits`).
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
| [Implementation](docs/implementation.md) | Архитектура, стек, FSD frontend, AI integration, storage, jobs, security и deployment. |
| [UI](docs/ui.md) | IA, landing, generator, result flow, states, responsive semantics и SEO surface. |
| [Billing](docs/billing.md) | Credit ledger, пакеты, платежный lifecycle и refunds. |
| [Testing](docs/testing.md) | Quality gates, contract tests, architecture checks, image-generation fixtures и release verification. |
| [Roadmap](docs/roadmap.md) | Порядок реализации, acceptance gates и future modules. |
| [Research](docs/research.md) | Ненормативный срез конкурентов и внешних технологий на дату исследования. |
| [Progress](docs/progress.md) | Ненормативный handoff между LLM/coding sessions. |
| [AGENTS.md](AGENTS.md) | Правила разработки LLM, Specification Lock, FSD boundaries и обязательный workflow. |

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
      payments/  payment-provider adapter
worker/
  generation worker из той же codebase
prisma/
  schema.prisma
  migrations/
```

FSD dependency direction: `1_app -> 2_pages -> 3_widgets -> 4_features -> 5_entities -> 6_shared`. Frontend slices импортируют только нижележащие слои; slices одного слоя не импортируют друг друга и предоставляют минимальный explicit public API.

Начальный stack:

- Next.js 16+ App Router + TypeScript;
- React + **Tailwind CSS + shadcn/ui как единственный UI/styling layer**;
- strict Feature-Sliced Design для frontend-части Next.js;
- Bun для install/scripts/runtime tooling;
- PostgreSQL как единственная обязательная база данных;
- Prisma ORM и migrations;
- Better Auth для account/session;
- внешний S3-compatible object storage для source/reference/generated images, подключаемый только через ENV и не поднимаемый Compose;
- **Kie.ai** как единственный image-generation API gateway MVP; initial model — `gpt-image-2-5-sunburst-image-to-image`;
- асинхронный Kie flow: `createTask -> callback/reconciliation -> copy result to AIDIX S3`;
- ЮKassa как первый production payment adapter для РФ;
- Docker Compose как обязательный способ запуска всего application stack в local/prod;
- Caddy как reverse proxy/TLS в production single-host topology.

Redis, Kubernetes, отдельный API service, message broker, локальный MinIO/S3, прямые OpenAI/fal.ai/Replicate integrations и собственный GPU inference в MVP не используются.

## Главный продуктовый invariant

Пользователь должен понимать разницу между визуальной концепцией и рабочим проектом. UI никогда не обещает точное соблюдение размеров или строительную реализуемость результата.
