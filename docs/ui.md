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

`/login` and `/register` may share the same passwordless Email OTP surface. Password form в MVP не существует.

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

Supporting promo copy: `3 бесплатные генерации`.

Do not claim exact construction accuracy or guaranteed latency before measured production data exists.

### Required sections

1. Hero + before/after visual.
2. «Как это работает» — upload -> room/style -> result.
3. Before/after examples.
4. Styles gallery.
5. What AI can do.
6. How to make a good source photo.
7. How to get a more realistic result.
8. Limitations.
9. Pricing/credit surface without invented prices.
10. FAQ.
11. Final CTA.

## 3. Authentication UX

MVP auth is passwordless Email OTP.

Canonical flow:

1. user enters email;
2. UI requests one-time code;
3. backend renders email with React Email and sends it through configured SMTP;
4. UI moves to code-entry state;
5. user enters received code;
6. successful verification creates/opens session;
7. first eligible account receives `3` promotional credits exactly once;
8. redirect to intended authenticated destination or `/app`.

Requirements:

- no password field/password reset;
- resend-code action with loading/disabled/cooldown state driven by server/auth behavior;
- invalid/expired code errors user-friendly;
- changing email returns to email-entry state;
- avoid account enumeration;
- exact OTP length/expiry/cooldown not hardcoded into copy unless configured/documented;
- no SMTP/vendor branding in UI;
- social-login buttons absent until providers selected.

## 4. Forms implementation

All interactive product forms use **Formisch + Valibot**.

Canonical UI pattern:

```text
Valibot schema
  -> Formisch useForm/Form/Field
  -> shadcn controls
  -> server submit
  -> Valibot server validation
```

Rules:

- Formisch owns client-side form state, field state and validation integration;
- Valibot schema is source of truth for form structure/validation;
- React Hook Form/Formik are not used;
- shadcn primitives provide visual controls only;
- do not use shadcn form abstractions that introduce React Hook Form;
- validation errors render close to fields and include accessible associations;
- submit/loading/disabled/error states come from Formisch/application state, not duplicated ad-hoc state;
- client validation does not replace server-side validation;
- form schema and form UI live in the correct FSD slice, usually `4_features/<feature>`;
- truly generic controls can live in `6_shared/ui`, but product validation semantics do not.

This applies to OTP login, project creation/editing, generator configuration and billing/payment forms.

## 5. SEO landing copy structure

Required topics:

- нейросеть для дизайна интерьера;
- дизайн комнаты по фотографии;
- визуализация ремонта;
- стили интерьера;
- AI limitations;
- FAQ.

Do not create thin SEO pages before the core landing works.

## 6. Dashboard `/app`

Shows:

- current credit balance;
- `New project` CTA;
- recent projects;
- recent generation status if any;
- empty state with first action.

New eligible account starts with `3` promotional credits.

## 7. Project screen

Header:

- project name;
- default room type;
- credit balance;
- `Create design` CTA.

Content:

- source images;
- generations chronological grid;
- statuses queued/running/succeeded/partial/failed;
- delete/archive project action separated from generation actions.

## 8. Generator

Prefer one page with progressive sections, not a route-per-step wizard.

### Source photo

Dropzone + preview. JPEG/PNG/WebP, max 15 MB.

Show dimensions, replace/remove action and photo-quality guidance.

### Room type

Required card/select catalog.

### Style

Required visual cards with selected state.

### References

Optional, max 3. Each reference has role:

- `Стиль / атмосфера`;
- `Мебель / предмет`;
- `Материал / отделка`.

### Wishes

Textarea plus optional `Не менять` field.

### Variants

Selector `1 / 2 / 4`.

Always show exact credit cost before submit, e.g. `Сгенерировать 2 варианта · 2 кредита`.

## 9. Generation progress

After submit navigate immediately to Generation screen.

States:

- queued: «Готовим задачу»;
- running: per-variant skeleton/progress copy;
- partial: show successes + failure explanation;
- failed: clear reason + refund copy when applicable.

No fake percentage unless provider supplies meaningful progress.

## 10. Result screen

Desktop:

- source/result compare;
- variant thumbnails;
- selected result actions.

Actions:

- download;
- favorite;
- generate more with same settings;
- use this result as source;
- back to project.

Before/after control keyboard accessible; mobile has static toggle fallback.

## 11. Error UX

Distinguish:

- invalid/expired OTP;
- SMTP/email delivery problem;
- invalid file;
- insufficient credits;
- generation rejected/unsupported;
- temporary AI service problem;
- partial generation failure;
- payment pending/failed.

Never show raw upstream errors.

If generation failure refunded: `Кредит возвращён на баланс`.

## 12. Billing UX

Billing page:

- current balance;
- approved purchasable offers when configured;
- purchase CTA only for configured entries;
- credit history;
- payment history.

Paid package names/amounts/prices remain `TBD`; placeholder commercial values must not ship.

## 13. Privacy UX

All projects private by default. Public gallery not in MVP.

Account deletion explains project/image deletion and any separately defined financial retention.

## 14. Responsive

Generator/result work from 360px.

Mobile generator keeps semantic order. Result mobile defaults to one large selected image + source/result toggle, then thumbnails/actions.

## 15. Accessibility

- native labels;
- visible focus;
- OTP supports paste/keyboard flow;
- Formisch errors connected to fields with accessible descriptions;
- keyboard-selectable style cards;
- alt text for marketing/generated images;
- live regions for meaningful status changes;
- color never sole error/status signal.

## 16. FAQ canonical topics

- Можно ли попробовать бесплатно?
- Работает ли сервис по фотографии?
- Какие фотографии подходят?
- Какие стили поддерживаются?
- Можно ли использовать результат как рабочий проект?
- Почему ИИ изменил окно/дверь/пропорции?
- Можно ли загрузить мебель или материал как референс?
- Что происходит с загруженными фотографиями?

Free-answer semantics: новый eligible account получает `3` promotional credits.

Floor-plan FAQ only after `PLAN_CONCEPT` is production-ready.

## 17. UI implementation rules

UI strictly **Tailwind CSS + shadcn/ui**.

- source shadcn primitives in `src/6_shared/ui`;
- product components built compositionally from shadcn + Tailwind;
- semantic tokens for colors/borders/radii/states;
- `globals.css` limited to Tailwind/shadcn theme/base;
- no CSS Modules/Sass/styled-components/Emotion;
- no MUI/Ant/Chakra/Mantine/Bootstrap;
- responsive/loading/error states via Tailwind + component variants.

## 18. Strict Feature-Sliced Design

Canonical folders:

```text
src/
  app/
  1_app/
  2_pages/
  3_widgets/
  4_features/
  5_entities/
  6_shared/
```

Import direction:

```text
1_app -> 2_pages -> 3_widgets -> 4_features -> 5_entities -> 6_shared
```

Rules:

- only downward imports;
- no same-layer slice imports;
- explicit public API;
- no root `components/hooks/utils/helpers/types` parallel architecture;
- `src/app` thin;
- form logic belongs to feature/page slices, not `shared`;
- shadcn primitives generic, product semantics not in shared.

FSD violations are architecture defects and must be caught automatically.
