# Roadmap

Roadmap fixes implementation order, not calendar promises.

## M0 — Repository foundation

Acceptance:

- Next.js/TypeScript/Bun project;
- strict frontend FSD skeleton: `src/app`, `src/1_app`, `src/2_pages`, `src/3_widgets`, `src/4_features`, `src/5_entities`, `src/6_shared`;
- automated FSD/import-boundary checks from the beginning;
- Tailwind CSS + shadcn/ui only, with shadcn primitives under `src/6_shared/ui`;
- lint/typecheck/test/build scripts;
- PostgreSQL + Prisma migration path;
- Better Auth basic account;
- Docker Compose local environment (`caddy`, `web`, `worker`, `postgres`, `migrate`) with no local S3 container;
- canonical docs and AGENTS rules committed.

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

## M2 — Credits

Deliver:

- append-only ledger;
- one-time signup promo grant of exactly `+3` credits;
- UI copy representing the promo as `3 бесплатные генерации`;
- balance UI;
- atomic reserve/charge helpers.

Gate:

- concurrent requests cannot overspend;
- promo cannot duplicate and always grants exactly 3 credits once.

## M3 — First AI generation

Deliver:

- `REDESIGN_PHOTO` generation;
- room/style/wishes;
- generation + variants lifecycle;
- worker;
- Kie.ai async image adapter (`createTask`, callback verification, `recordInfo` reconciliation);
- initial `gpt-image-2-5-sunburst-image-to-image` mapping;
- stable output copy from temporary Kie result URL to external AIDIX S3;
- technical failure refunds.

Gate:

- end-to-end generation works with fake provider in CI;
- opt-in real Kie provider smoke;
- initial image benchmark accepted.

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
- partial failure charges/refunds correctly.

## M5 — Public landing and SEO

Deliver:

- hero with `3 бесплатные генерации` offer;
- before/after examples;
- how it works;
- styles;
- limitations;
- FAQ;
- pricing preview;
- metadata/sitemap/robots/schema where appropriate.

Gate:

- every CTA resolves to functional signup/generator flow;
- no copy promises unimplemented plan/3D capability;
- landing/authenticated frontend obey FSD and Tailwind + shadcn constraints.

## M6 — Payments

Deliver:

- package catalog;
- ЮKassa create/return/webhook;
- payment history;
- credit grants;
- support reconciliation path.

Gate:

- sandbox payment passes;
- duplicate webhook idempotency passes;
- user never receives credits from return URL alone.

## M7 — Production hardening / MVP launch

Deliver:

- production Docker Compose deployment;
- TLS;
- backups;
- structured logs;
- generation metrics;
- rate limiting/abuse controls;
- privacy/terms/error monitoring.

Launch gate defined in `testing.md`.

---

# Post-MVP

## V1.1 — Local editing

- mask upload/editor;
- change wall/floor/furniture operations;
- model-specific local edit prompt recipes.

## V1.1 — Upscale

Research dedicated upscaler vs high-resolution re-generation. Define separate credit cost only after measured provider cost/quality.

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
