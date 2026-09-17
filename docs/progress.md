# Progress

This document is operational handoff, not canonical requirements.

## Current milestone

`M0 — Repository foundation`

## Current task

`COMPLETED` — initialize the AIDIX codebase from the canonical documentation.

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

## Next action

Continue with M1 according to `docs/roadmap.md`:

1. Project CRUD with owner-scoped access;
2. Formisch + Valibot project forms;
3. External S3 storage boundary;
4. Image upload validation and normalization;
5. Project gallery/history shell.

## Verification

- `bun run lint` passes with Biome;
- `bun run typecheck` passes;
- `bun test` passes;
- `bun run build` passes with configured placeholder ENV;
- Prisma schema validates and Prisma Client generates with external PostgreSQL configuration.

## Non-blocking TBD decisions

These do not block M0:

- exact Kie.ai image model — required before M3;
- browser E2E framework — checkpoint M3–M4, required before production launch;
- paid catalog/package sizes/prices/currency/fiscal settings — required before M6.

SMTP vendor is not a product TBD: deployment supplies a compatible SMTP server through ENV. The concrete SMTP transport npm/Bun package is a replaceable implementation detail and may be selected during implementation without changing product semantics.

## Blockers

None for starting M0.

Do not substitute guessed values for the remaining TBD decisions.
