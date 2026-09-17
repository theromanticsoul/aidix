# Roadmap

Roadmap fixes implementation order, not calendar promises.

## M0 — Repository foundation

Acceptance:

- Next.js/TypeScript project running with Bun as runtime/package manager;
- strict FSD skeleton and automated import-boundary checks;
- Tailwind CSS + shadcn/ui only;
- Formisch + Valibot form foundation;
- T3 Env + Valibot ENV validation foundation;
- no raw `process.env` usage outside env bootstrap/config;
- lint/typecheck/`bun test`/build scripts;
- Prisma migration path against external PostgreSQL via `DATABASE_URL`;
- Better Auth Email OTP skeleton;
- React Email OTP template skeleton;
- provider-neutral `EmailSender` boundary + fake test adapter;
- SMTP ENV schema (`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM_EMAIL`, `SMTP_FROM_NAME`);
- SMTP transport package isolated as replaceable infrastructure implementation;
- Docker Compose containing `web`, `worker`, `migrate` only;
- no Caddy/PostgreSQL/S3 container;
- external PostgreSQL/S3 ENV validation;
- canonical docs committed.

Gate:

- `bun run lint`, `bun run typecheck`, `bun test`, `bun run build` pass;
- FSD/Formisch/ENV architecture checks pass;
- application containers start with valid external DB config;
- missing required ENV fails fast;
- no unapproved browser E2E dependency introduced.

## M1 — Project and asset foundation

Deliver:

- project CRUD;
- Formisch + Valibot project forms;
- external S3 storage;
- image upload/validation/normalization;
- project gallery/history shell.

Gate:

- cross-user authorization tests;
- private storage tests;
- FSD/form architecture checks;
- valid source image owner-only.

## M2 — Auth completion and credits

Deliver:

- production-ready Better Auth Email OTP application flow;
- React Email OTP template;
- SMTP transport implementation using environment-configured SMTP server;
- append-only credit ledger;
- one-time `+3` promo grant after eligible first OTP auth;
- balance UI;
- atomic reserve/charge helpers.

Gate:

- OTP request renders React Email and sends through fake SMTP in normal tests;
- opt-in SMTP test delivery succeeds with configured test ENV before production;
- OTP values/secrets absent from logs;
- concurrent requests cannot overspend;
- promo exactly once.

No SMTP SaaS vendor is selected in product code; deployment supplies SMTP configuration.

## M3 — First AI generation

Before implementation, owner approves Kie.ai image model. Current `KIE_IMAGE_MODEL=TBD`.

Deliver:

- `REDESIGN_PHOTO` generation;
- Formisch + Valibot generator form;
- room/style/wishes;
- generation/variants lifecycle;
- worker;
- Kie adapter for approved model;
- result copy to external S3;
- technical failure refunds.

Gate:

- selected model documented;
- fake-provider E2E at application level through Bun tests;
- opt-in Kie smoke;
- image benchmark accepted.

Browser E2E tool checkpoint begins during M3–M4. Tool is `TBD`; Playwright not preselected.

## M4 — References and result UX

Deliver:

- up to 3 role-labelled references;
- 1/2/4 variants;
- before/after compare;
- download/favorite;
- use result as next source;
- partial-generation UX.

Gate:

- reference ordering covered;
- partial failure credits correct;
- browser E2E tool decision completed before release-ready status.

## M5 — Public landing and SEO

Deliver:

- hero with `3 бесплатные генерации`;
- before/after examples;
- how it works;
- styles;
- limitations;
- FAQ;
- pricing/credits section without invented commercial values;
- metadata/sitemap/robots/schema where appropriate.

Gate:

- CTA resolves to OTP flow/generator;
- no unimplemented plan/3D claims;
- no unapproved prices;
- FSD + Tailwind/shadcn + Formisch/Valibot conventions pass.

## M6 — Payments

Before production catalog implementation, owner approves package structure, credit amounts, prices, currency and fiscal/tax semantics. Current values `TBD`.

Deliver:

- approved paid catalog;
- Robokassa checkout;
- authoritative ResultURL verification;
- SuccessURL/FailURL navigation only;
- payment history;
- idempotent credit grants;
- reconciliation/support path;
- test-mode coverage.

Gate:

- catalog/fiscal settings approved;
- test payment passes;
- invalid signature/amount/invoice rejected;
- duplicate notification idempotent;
- SuccessURL alone never grants credits.

## M7 — Production hardening / MVP launch

Deliver:

- production Docker deployment `web`, `worker`, `migrate`;
- external PostgreSQL migration/backup/recovery procedure;
- public HTTPS/TLS verified in chosen environment;
- complete T3 Env production schema;
- SMTP production configuration and delivery verification;
- structured logs/metrics/rate limiting/error monitoring;
- privacy/terms;
- approved browser E2E suite.

Launch gate defined in `testing.md`.

---

# Post-MVP

## Social authentication

Better Auth remains auth framework. Concrete social providers `TBD` until owner decision.

## V1.1 — Local editing

- mask editor;
- wall/floor/furniture operations;
- model-specific recipes.

## V1.1 — Upscale

Separate quality/cost research before defining credit price.

## V1.2 — Text-to-interior

Separate mode from photo redesign.

## V1.2 — Floor-plan concept spike

Research concept generation from plans without implying engineering accuracy.

## V2 — Material/furniture catalog

Requires explicit catalog source/rights/pricing data.

## Research track — 3D

Not an incremental image-generation feature. Start only after defining required output type.
