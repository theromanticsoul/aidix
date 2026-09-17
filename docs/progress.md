# Progress

This document is operational handoff, not canonical requirements.

## Current milestone

`M0 — Repository foundation`

## Current task

`READY` — initialize the AIDIX codebase from the canonical documentation.

## Inputs completed

- boss requirement reviewed;
- reference RECOMS documentation structure reviewed;
- competitor research snapshot prepared;
- MVP scope defined;
- Kie.ai selected as image-generation API gateway;
- Robokassa selected as payment provider;
- external S3 via ENV confirmed;
- external PostgreSQL via `DATABASE_URL` confirmed;
- Bun confirmed as runtime/package manager/test runner;
- Prisma and Better Auth confirmed;
- MVP authentication confirmed as passwordless Email OTP;
- Tailwind + shadcn/ui and strict FSD frontend confirmed;
- Docker application stack confirmed without Caddy/PostgreSQL/S3 containers;
- paid prices/catalog reset to `TBD`.

## Next action

Initialize codebase and repository foundation according to `docs/roadmap.md` M0:

1. Next.js + TypeScript running on Bun;
2. FSD folder skeleton and import-boundary enforcement;
3. Tailwind + shadcn/ui foundation;
4. lint/typecheck/`bun test`/build scripts;
5. Prisma configured against external `DATABASE_URL`;
6. Better Auth Email OTP skeleton with provider-neutral/fake email sender boundary;
7. Docker Compose for `web`, `worker`, `migrate` only;
8. external PostgreSQL/S3 ENV validation;
9. server core/infrastructure boundaries;
10. update progress after M0 verification.

## Non-blocking TBD decisions

These do not block M0 foundation work:

- production transactional email provider — required before production OTP delivery / M2 completion;
- Kie.ai image model — required before M3 generation implementation;
- browser E2E framework — checkpoint during M3–M4, required before production launch;
- paid catalog structure/package sizes/prices/currency/fiscal settings — required before M6.

## Blockers

None for starting M0.

Do not substitute guessed values for the TBD decisions above.
