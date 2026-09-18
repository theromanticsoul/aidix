# Progress

This document is operational handoff, not canonical requirements.

## Current milestone

`M3 — First AI generation`

## Current task

`IN PROGRESS` — queued REDESIGN_PHOTO generation slice, atomic credit charge, prompt snapshot, Kie.ai provider adapter, and worker orchestration.

## Inputs completed

- boss requirement reviewed;
- reference RECOMS documentation structure reviewed;
- competitor research snapshot prepared;
- MVP scope defined;
- Kie.ai selected as image-generation API gateway; model remains `TBD` until M3;
- Robokassa selected as payment provider;
- external S3 via ENV confirmed;
- external PostgreSQL via `DATABASE_URL` confirmed;
- Bun confirmed as runtime/package manager/test runner;
- Prisma and Better Auth confirmed;
- MVP auth confirmed as passwordless Email OTP;
- React Email confirmed for transactional email templates;
- SMTP confirmed as delivery transport configured entirely through ENV;
- T3 Env + Valibot confirmed for ENV validation;
- Formisch + Valibot confirmed for React forms;
- Valibot is canonical schema validation library; Zod/React Hook Form are not part of stack;
- Tailwind + shadcn/ui and strict FSD frontend confirmed;
- Docker application stack confirmed without Caddy/PostgreSQL/S3 containers;
- paid catalog/prices remain `TBD`.
- owner-approved Kie.ai test profile: GPT Image 2.5 Sunburst, `1K`; production model remains `TBD`.

## Next action

Continue with M3 according to `docs/roadmap.md`:

1. Add generator UI and opt-in Kie smoke test;
2. Verify external PostgreSQL/S3 behavior with configured test services.

## Verification

- `bun run lint` passes with Biome;
- `bun run typecheck` passes;
- `bun test` passes;
- `bun run build` passes with configured placeholder ENV;
- Prisma schema validates and Prisma Client generates with external PostgreSQL configuration.
- M1 unit tests cover project owner isolation and image normalization.
- Opt-in PostgreSQL and S3 integration tests are available and skipped without explicit `INTEGRATION_TESTS=true` configuration.
- Credit idempotency, balance isolation, OTP email rendering, and fake sender tests pass locally.
- Generation cost, queued lifecycle input, prompt constraints, and insufficient-credit behavior are covered by Bun tests.
- Worker submission, provider failure handling, and the authoritative output persistence contract are covered by Bun tests.
- Prisma worker adapter claims pending variants, persists Kie task ids, copies normalized results to S3, derives parent status, and refunds terminal failures idempotently.

## Non-blocking TBD decisions

These do not block M0:

- production Kie.ai image model — remains `TBD`; the approved Sunburst profile is test/smoke-only;
- browser E2E framework — checkpoint M3–M4, required before production launch;
- paid catalog/package sizes/prices/currency/fiscal settings — required before M6.

SMTP vendor is not a product TBD: deployment supplies a compatible SMTP server through ENV. The concrete SMTP transport npm/Bun package is a replaceable implementation detail and may be selected during implementation without changing product semantics.

## Blockers

M1 external PostgreSQL/S3 and M2 Better Auth database integration tests require explicitly configured test services; normal CI remains network-free.

Do not substitute guessed values for the remaining TBD decisions.
