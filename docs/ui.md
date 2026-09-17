# UI / UX specification

## 1. Information architecture

Public:

```text
/
/pricing
/examples
/login
/register
```

Authenticated:

```text
/app
/app/projects/new
/app/projects/:projectId
/app/projects/:projectId/generate
/app/generations/:generationId
/app/billing
/app/account
```

MVP may collapse `/pricing` and `/examples` into landing sections initially, but canonical content must remain addressable and reusable.

`/login` and `/register` may share the same passwordless Email OTP surface. The product must not introduce a password form in MVP.

## 2. Landing page

### Hero

H1 target:

**Нейросеть для дизайна интерьера — создайте дизайн комнаты по фото**

Hero immediately answers:

- что делает сервис;
- нужен ли photo;
- сколько шагов;
- что пользователь получает **3 бесплатные генерации** после первого подтверждённого входа.

Primary CTA: `Попробовать бесплатно`.

Supporting promo copy should say `3 бесплатные генерации`, not `первая генерация бесплатно`.

Do not claim exact construction accuracy or guaranteed 30-second latency before measured production data exists.

### Required sections

1. Hero + before/after visual.
2. «Как это работает» — upload -> room/style -> result.
3. Before/after examples.
4. Styles gallery.
5. What AI can do.
6. How to make a good source photo.
7. How to get a more realistic result.
8. Limitations.
9. Pricing/credit surface. Concrete paid prices/packages remain `TBD` until approved.
10. FAQ.
11. Final CTA.

This preserves the boss-provided SEO/product structure while removing claims for unimplemented plan/3D features.

## 3. Authentication UX

MVP auth is passwordless Email OTP.

Canonical flow:

1. user enters email;
2. UI submits request to send one-time code;
3. UI moves to code-entry state for the same email;
4. user enters received code;
5. successful verification creates/opens the account session;
6. first eligible account receives `3` promotional credits exactly once;
7. redirect to the intended authenticated destination or `/app`.

Requirements:

- no password field, password creation, password reset or password hints in MVP;
- resend-code action exists with disabled/loading/cooldown state driven by server/auth behavior;
- invalid/expired code errors are user-friendly and never expose internal Better Auth/provider errors;
- changing email returns user to the email-entry state;
- UI should not reveal whether an email already had an account before OTP verification in a way that creates account-enumeration risk;
- exact OTP length/expiry/cooldown must not be hardcoded into product copy unless explicitly configured and documented;
- transactional email provider branding is not shown unless separately approved;
- social-login buttons are not shown until concrete providers are selected and implemented.

Production email-delivery provider is `TBD` and is not a UI decision.

## 4. SEO landing copy structure

Required headings/topics:

- нейросеть для дизайна интерьера;
- дизайн комнаты по фотографии;
- визуализация ремонта;
- стили интерьера;
- AI limitations;
- FAQ.

Do not create dozens of thin SEO pages before core landing ranks/works. Future room-specific pages may reuse the same generator with prefilled room type but need unique useful content.

## 5. Dashboard `/app`

Shows:

- current credit balance;
- `New project` CTA;
- recent projects;
- recent generation status if any;
- empty state with example and first action.

For a newly eligible account, the initial balance is `3` promotional credits and UI may explain it as `3 бесплатные генерации`.

No analytics dashboard in MVP.

## 6. Project screen

Header:

- project name;
- default room type;
- credit balance;
- `Create design` CTA.

Content:

- source images;
- generations chronological grid;
- statuses: queued/running/succeeded/partial/failed;
- delete/archive project action separated from generation actions.

## 7. Generator

Prefer one page with progressive sections, not a wizard requiring a route per step.

### Section A — Source photo

Dropzone + preview.

Accept: JPEG/PNG/WebP, max 15 MB.

After upload show:

- dimensions;
- replace/remove;
- photo-quality guidance.

### Section B — Room type

Card/select catalog. Required.

### Section C — Style

Visual cards with preview, title and selected state. Required.

### Section D — References

Optional, max 3.

Each added image requires role:

- `Стиль / атмосфера`;
- `Мебель / предмет`;
- `Материал / отделка`.

Explain: reference is guidance, not guaranteed exact copy.

### Section E — Wishes

Textarea up to product-defined limit (target 1000–2000 chars).

Placeholder examples:

- «Сохранить паркет и окно, заменить мебель»;
- «Светлые стены, тёплый дуб, без ярких цветов».

Separate optional `Не менять` field is preferred over asking user to encode everything in one prompt.

### Section F — Variants

Selector 1 / 2 / 4.

Always display exact credit cost before submit.

Button:

`Сгенерировать 2 варианта · 2 кредита`

Disabled when requirements missing or insufficient balance.

## 8. Generation progress

After submit navigate immediately to Generation screen.

Do not keep browser request open waiting for provider.

States:

- queued: «Готовим задачу»;
- running: per-variant skeleton/progress copy;
- partial: show successes immediately plus retry/failure explanation;
- failed: clear reason + refunded credits if applicable.

Avoid fake percentage unless provider supplies meaningful progress. Use indeterminate progress + elapsed time.

## 9. Result screen

Primary layout desktop:

- source photo and selected result compare;
- thumbnails of variants;
- selected result actions.

Actions MVP:

- download;
- favorite;
- generate more with same settings;
- use this result as source;
- back to project.

Before/after slider must remain keyboard accessible; provide static toggle fallback on mobile.

## 10. Error UX

User should distinguish:

- invalid/expired OTP;
- temporary email-delivery problem;
- invalid file;
- insufficient credits;
- generation rejected/unsupported;
- temporary AI service problem;
- partial generation failure;
- payment pending/failed.

Never show raw upstream error strings.

If refundable generation failure occurred, state explicitly: `Кредит возвращён на баланс`.

## 11. Billing UX

Billing page:

- current balance;
- approved purchasable offers/packages when they exist;
- purchase CTA only for configured catalog entries;
- credit history condensed;
- payment history.

Paid package names, amounts and prices are currently `TBD`; UI must not ship placeholder commercial values as if they were real.

## 12. Privacy UX

All projects private by default.

No «community gallery» checkbox hidden in generator. Publishing is future explicit opt-in feature.

Account deletion warns about project/image deletion and separately explains financial record retention where legally required.

## 13. Responsive

Generator and result flows must work from 360px width.

Mobile generator order matches desktop semantic order. Do not use horizontal carousels for required form controls if they hide options without clear affordance.

Result screen on mobile defaults to one large selected image + source/result toggle, then thumbnails/actions.

## 14. Accessibility

- native labels for upload/form controls;
- visible focus;
- OTP fields support paste and keyboard flow;
- keyboard selectable style cards;
- alt text for static marketing examples;
- generated private images use contextual alt such as `Сгенерированный вариант 2`;
- status changes announced via live region where appropriate;
- color is never the only error/status signal.

## 15. FAQ canonical topics

- Можно ли попробовать бесплатно?
- Работает ли сервис по фотографии?
- Какие фотографии подходят?
- Какие стили поддерживаются?
- Можно ли использовать результат как рабочий проект?
- Почему ИИ изменил окно/дверь/пропорции?
- Можно ли загрузить мебель или материал как референс?
- Что происходит с загруженными фотографиями?

Canonical free-answer semantics: новый eligible account получает `3` promotional credits, то есть три single-variant бесплатные генерации либо эквивалентный расход на multi-variant request.

Floor-plan FAQ appears only after `PLAN_CONCEPT` exists in production.

## 16. UI implementation rules

UI AIDIX реализуется строго через **Tailwind CSS + shadcn/ui**.

Canonical rules:

- shadcn/ui primitives являются базовыми interactive components;
- source shadcn primitives располагаются в `src/6_shared/ui`;
- product components собираются композиционно из shadcn primitives и Tailwind utilities;
- цвета, borders, radii, typography и states используют semantic shadcn/Tailwind tokens;
- `globals.css` ограничен Tailwind imports, shadcn CSS variables/theme и необходимым base layer;
- page-specific layout/styling не переносится в handwritten global CSS;
- не использовать CSS Modules, Sass/SCSS, styled-components, Emotion или parallel CSS-in-JS layer;
- не добавлять MUI, Ant Design, Chakra, Mantine, Bootstrap или другую component library;
- application code не должен напрямую строить второй primitive layer рядом с shadcn;
- новые reusable components сначала проверяют, существует ли подходящий shadcn primitive/pattern;
- responsive, hover/focus/disabled/error/loading states реализуются Tailwind utilities и shadcn variants.

Исключение для дополнительной UI/styling библиотеки требует explicit owner decision и semantic update этого документа до implementation.

## 17. Strict Feature-Sliced Design

Frontend-часть Next.js обязана использовать Feature-Sliced Design.

Canonical folders:

```text
src/
  app/         Next.js App Router adapters only
  1_app/       providers/application composition
  2_pages/     page compositions
  3_widgets/   reusable large page blocks
  4_features/  user interactions/use-cases
  5_entities/  business UI entities
  6_shared/    shared UI/lib/config
```

Числовые префиксы являются обязательной частью структуры. Они не дают Next.js интерпретировать FSD `pages` layer как legacy Pages Router и визуально фиксируют dependency order.

Import direction:

```text
1_app -> 2_pages -> 3_widgets -> 4_features -> 5_entities -> 6_shared
```

Rules:

- слой импортирует только нижележащие слои;
- slices одного слоя не импортируют друг друга;
- каждый slice предоставляет минимальный explicit public API;
- wildcard barrel exports запрещены;
- `src/app` содержит только route/layout/metadata/server-adapter composition и не становится отдельным набором product components;
- `3_widgets` создаётся только при реальной необходимости;
- generic root folders `components`, `hooks`, `utils`, `helpers`, `types` запрещены как обход FSD;
- shadcn primitives и truly generic UI живут в `6_shared`, product semantics — в `features/entities/widgets/pages`;
- page-specific composition не переносится в `6_shared`.

Нарушение FSD boundaries считается architecture defect и должно ловиться review/lint/architecture tests.
