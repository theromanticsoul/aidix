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

Initialize codebase according to `docs/roadmap.md` M0:

1. Next.js + TypeScript on Bun;
2. FSD folder skeleton/import boundaries;
3. Tailwind + shadcn/ui;
4. Formisch + Valibot form foundation;
5. T3 Env + Valibot ENV modules with raw `process.env` isolation;
6. Prisma against external `DATABASE_URL`;
7. Better Auth Email OTP skeleton;
8. React Email OTP template;
9. EmailSender port + fake adapter + isolated SMTP transport implementation;
10. Docker Compose for `web`, `worker`, `migrate`;
11. external PostgreSQL/S3/SMTP ENV validation;
12. lint/typecheck/`bun test`/build verification.

## Non-blocking TBD decisions

These do not block M0:

- exact Kie.ai image model — required before M3;
- browser E2E framework — checkpoint M3–M4, required before production launch;
- paid catalog/package sizes/prices/currency/fiscal settings — required before M6.

SMTP vendor is not a product TBD: deployment supplies a compatible SMTP server through ENV. The concrete SMTP transport npm/Bun package is a replaceable implementation detail and may be selected during implementation without changing product semantics.

## Blockers

None for starting M0.

Do not substitute guessed values for the remaining TBD decisions.
