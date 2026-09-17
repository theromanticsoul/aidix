# Roadmap

Roadmap fixes implementation order, not calendar promises.

## M0 — Repository foundation

Acceptance:

- Next.js/TypeScript project running with Bun as runtime/package manager;
- strict frontend FSD skeleton: `src/app`, `src/1_app`, `src/2_pages`, `src/3_widgets`, `src/4_features`, `src/5_entities`, `src/6_shared`;
- automated FSD/import-boundary checks from the beginning;
- Tailwind CSS + shadcn/ui only, with shadcn primitives under `src/6_shared/ui`;
- lint/typecheck/`bun test`/build scripts;
- Prisma migration path against external PostgreSQL from `DATABASE_URL`;
- Better Auth Email OTP skeleton with provider-neutral email sender boundary and fake test adapter; production email provider remains `TBD`;
- Docker Compose application environment containing `web`, `worker`, `migrate` only;
- no Caddy, PostgreSQL or S3 container in repository Compose;
- external PostgreSQL/S3 ENV validation;
- canonical docs and AGENTS rules committed.

Gate:

- `bun run lint`, `bun run typecheck`, `bun test`, `bun run build` pass;
- FSD architecture checks pass;
- application containers can start with valid external database configuration;
- no unapproved email provider/browser E2E dependency is introduced.

## M1 — Project and asset foundation

Deliver:

- project CRUD;
- authenticated external S3-compatible object storage from ENV;
- image upload/validation/normalization;
- project gallery/history shell implemented inside documented FSD boundaries.

Gate:

- cross-user authorization tests;
- private storage tests;
- FSD architecture checks pass;
- valid source image can be uploaded and viewed only by owner.

## M2 — Auth completion and credits

Deliver:

- production-ready Better Auth Email OTP flow at application level;
- provider-neutral email delivery boundary;
- production transactional email provider integration only after explicit owner selection;
- append-only credit ledger;
- one-time signup promo grant of exactly `+3` credits after eligible first OTP authentication;
- UI copy representing the promo as `3 бесплатные генерации`;
- balance UI;
- atomic reserve/charge helpers.

Gate:

- fake-email OTP flow is fully covered with Bun tests;
- production email vendor remains a documented blocker until selected/configured;
- concurrent requests cannot overspend;
- promo cannot duplicate and always grants exactly 3 credits once.

## M3 — First AI generation

Before implementation begins, owner must approve the Kie.ai image model. Current canonical value: `KIE_IMAGE_MODEL=TBD`.

Deliver:

- `REDESIGN_PHOTO` generation;
- room/style/wishes;
- generation + variants lifecycle;
- worker;
- Kie.ai async image adapter (`createTask`, callback verification, `recordInfo` reconciliation);
- mapping for the explicitly approved Kie.ai model;
- stable output copy from temporary Kie result URL to external AIDIX S3;
- technical failure refunds.

Gate:

- selected model documented before implementation;
- end-to-end generation works with fake provider in Bun tests;
- opt-in real Kie provider smoke;
- initial image benchmark accepted.

Browser E2E tool checkpoint occurs during M3–M4. A browser E2E tool is expected before production launch, but Playwright/Cypress/other framework is not preselected.

## M4 — References and result UX

Deliver:

- up to 3 role-labelled references;
- 1/2/4 variants;
- before/after compare;
- download/favorite;
- use result as next source;
- partial-generation UX.

Gate:

- reference prompt/input ordering covered;
- partial failure charges/refunds correctly;
- browser E2E tool decision completed and critical authenticated generation flow covered before M4 is considered release-ready.

## M5 — Public landing and SEO

Deliver:

- hero with `3 бесплатные генерации` offer;
- before/after examples;
- how it works;
- styles;
- limitations;
- FAQ;
- pricing/credits section without invented commercial values;
- metadata/sitemap/robots/schema where appropriate.

Gate:

- every CTA resolves to functional OTP signup/login/generator flow;
- no copy promises unimplemented plan/3D capability;
- no unapproved package price/name appears in UI;
- landing/authenticated frontend obey FSD and Tailwind + shadcn constraints.

## M6 — Payments

Before implementation of production catalog, owner must approve package structure, credit amounts, prices, currency and required fiscal/tax semantics. Current values are `TBD`.

Deliver:

- approved paid catalog;
- Robokassa payment checkout with signed `MerchantLogin + OutSum + InvId` parameters;
- Robokassa `ResultURL` handler with Password #2 signature verification, amount/invoice verification and `OK{InvId}` acknowledgement;
- `SuccessURL` / `FailURL` user redirect screens that never grant credits directly;
- payment history;
- idempotent credit grants;
- support reconciliation path;
- Robokassa test-mode integration coverage.

Gate:

- paid catalog and fiscal settings explicitly approved;
- Robokassa test payment passes;
- invalid ResultURL signature is rejected;
- wrong amount/invoice is rejected;
- repeated valid ResultURL notification is idempotent;
- user never receives credits from `SuccessURL` alone.

## M7 — Production hardening / MVP launch

Deliver:

- production Docker deployment for `web`, `worker`, `migrate`;
- external PostgreSQL migration/backup/recovery procedure for the chosen database deployment;
- public HTTPS endpoint/TLS verified in the chosen deployment environment without introducing Caddy by default;
- structured logs;
- generation metrics;
- rate limiting/abuse controls;
- privacy/terms/error monitoring;
- production transactional email provider configured;
- critical browser E2E suite using the explicitly approved tool.

Launch gate defined in `testing.md`.

---

# Post-MVP

## Social authentication

Better Auth remains the auth framework. Social login is a planned capability, but specific providers remain `TBD` until explicit owner decision.

## V1.1 — Local editing

- mask upload/editor;
- change wall/floor/furniture operations;
- model-specific local edit prompt recipes.

## V1.1 — Upscale

Research dedicated upscaler vs high-resolution re-generation. Define separate credit cost only after measured provider cost/quality and explicit owner decision.

## V1.2 — Text-to-interior

Generate concept without user room photo. Keep separate from photo-redesign because product promise differs.

## V1.2 — Floor-plan concept spike

Research whether floor plan + constraints can produce useful perspective concepts while clearly communicating non-engineering accuracy.

Gate before productization:

- benchmark across several plan shapes;
- output does not falsely imply exact dimensions;
- UX distinguishes plan concept from photo redesign.

## V2 — Material/furniture catalog

Requires product/catalog source and rights, not just AI references.

Potential capabilities:

- SKU image references;
- dimensions;
- price/availability;
- affiliate/commerce integration;
- visual matching confidence.

## Research track — 3D

Not scheduled as incremental image-generation feature.

Only start after decision on required output:

- simple panorama;
- navigable room;
- editable scene;
- exportable CAD/BIM.

These are materially different products and must not share one vague `3D` requirement.
