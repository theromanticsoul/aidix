# Testing and quality gates

## 1. Test layers

```text
bun unit
  -> domain/application integration
    -> ENV/email/form contracts
      -> external database/storage integration where required
        -> architecture/FSD checks
          -> browser E2E (tool TBD)
            -> opt-in external-provider smoke
```

Canonical JS/TS runner is **`bun:test`**. Do not add Vitest/Jest without explicit decision.

Normal CI must not spend Kie credits, create live Robokassa payments or send real SMTP mail.

## 2. Unit/domain tests

Required coverage:

- generation cost calculation;
- insufficient balance;
- one-time signup promo `+3`;
- promo idempotency;
- refund idempotency;
- parent generation status derivation;
- retry classification;
- ownership policies;
- payment transitions;
- purchase credit-grant idempotency.

## 3. Environment validation tests

T3 Env + Valibot is canonical.

Required coverage:

- valid minimal server ENV parses successfully;
- malformed `DATABASE_URL` rejected;
- missing required secrets rejected;
- `SMTP_PORT` coercion/validation follows schema;
- invalid `SMTP_SECURE` representation rejected/normalized according to schema;
- incomplete SMTP credentials fail according to the documented schema contract;
- S3/Kie/Robokassa required variables validated for the relevant enabled process/use case;
- server secrets are not exposed through client env surface;
- no application modules read `process.env` directly outside allowed env bootstrap modules.

Architecture tests should scan/import-check raw `process.env` usage.

## 4. Forms / Valibot tests

All product forms use Formisch + Valibot.

Required coverage for representative forms (OTP, project, generator):

- Valibot schema accepts valid input and rejects invalid input;
- Formisch submission receives schema-normalized output;
- field errors map to correct fields;
- submit disabled/loading/error behavior does not duplicate contradictory ad-hoc state;
- server handler validates input again with Valibot;
- no React Hook Form/Formik dependency or imports;
- shadcn controls remain presentation primitives.

Do not treat client Formisch validation as an authorization/security boundary.

## 5. Database integration

Real SQL semantics use explicitly configured external test PostgreSQL via ENV; no local PostgreSQL container and no SQLite substitute for locking/transaction behavior.

Verify:

- concurrent generation requests cannot double-spend;
- worker claim locking prevents duplicate processing;
- duplicate Robokassa notification cannot double-credit;
- duplicate refund cannot double-refund;
- promo grant exactly once;
- FK/unique constraints match invariants.

## 6. Storage integration

Normal tests use fake `ObjectStorage`. Dedicated opt-in tests use external S3-compatible test bucket from ENV.

Verify private put/read/delete, signed URL behavior, content type, private ACL/access assumptions and opaque object keys.

No filesystem/MinIO fallback.

## 7. Authentication / React Email / SMTP tests

Better Auth Email OTP is MVP auth.

Normal tests use fake `EmailSender`/SMTP transport.

Required coverage:

- requesting OTP invokes email boundary;
- OTP email is rendered through React Email;
- rendered HTML/text contains intended code/user-facing content and no unrelated secrets;
- subject/from/to are correct;
- fake SMTP transport receives exactly one send request for one OTP request under normal flow;
- SMTP transport failure maps to safe application/auth error;
- valid OTP creates/opens session;
- invalid/expired OTP does not authenticate;
- first eligible auth grants exactly `+3` once;
- later sign-ins do not repeat promo;
- password auth UI/routes are absent;
- OTP and SMTP password never reach production logger paths.

A real SMTP smoke test is opt-in and uses explicitly configured test SMTP ENV; normal CI never sends mail.

## 8. Kie.ai adapter contract tests

Use fake HTTP fixtures; no paid Kie calls in normal CI.

Exact model contract tests are finalized after owner selects `KIE_IMAGE_MODEL` before M3.

Generic required behavior:

- successful task submission/task id mapping;
- retryable rate-limit/network/5xx errors;
- terminal failure mapping;
- callback/reconciliation idempotency where selected API supports them;
- malformed provider response rejected by Valibot;
- successful result copied to S3 before internal success;
- temporary provider URL discarded.

## 9. Robokassa contract tests

Normal CI uses fake signed requests.

Verify:

- checkout constructed from persisted amount/invoice;
- valid ResultURL signature accepted;
- invalid signature rejected;
- unknown invoice rejected;
- amount mismatch rejected;
- first success creates one purchase grant;
- duplicate success is idempotent;
- SuccessURL alone never grants credits;
- secrets never reach browser/logs.

Production prices/catalog remain `TBD`; tests use explicit fixture purchase snapshots.

## 10. Prompt snapshot and image benchmark

Prompt snapshots use `bun:test` and versioned canonical fixtures.

Before changing Kie model or major prompt version, benchmark geometry preservation, style adherence, immutable elements, references, artifacts, latency and cost.

## 11. Frontend architecture / FSD checks

CI enforces:

- `1_app -> 2_pages -> 3_widgets -> 4_features -> 5_entities -> 6_shared`;
- no same-layer slice imports;
- public API boundaries;
- thin `src/app`;
- no root generic parallel folders;
- no direct infrastructure imports from FSD slices;
- shadcn primitives stay in shared UI;
- forms use Formisch + Valibot;
- no React Hook Form/Formik;
- no Zod parallel schema stack;
- no raw ENV reads outside env bootstrap.

## 12. Browser E2E decision

Browser E2E is required before production launch, but tool remains `TBD`. Playwright is only a candidate.

Decision checkpoint: M3–M4.

Target flows after selection:

1. Email OTP sign-in with fake SMTP/email sender;
2. initial balance `3`;
3. create project;
4. upload photo;
5. configure generator form;
6. submit generation with fake Kie;
7. queued/running/success UI;
8. compare/download result;
9. insufficient credits;
10. mocked Robokassa success exactly once;
11. SuccessURL alone no grant;
12. technical generation failure/refund.

## 13. Security tests

At minimum:

- cross-user access denied;
- unauthenticated generation denied;
- OTP identity cannot be client-forged;
- MIME spoof/oversized upload rejected;
- XSS payloads rendered safely;
- Kie callback verification according to selected contract;
- Robokassa invalid signature/amount rejected;
- secrets/OTP absent from client bundle/logs;
- SMTP credentials are server-only T3 Env values.

## 14. Build gates

Biome is the canonical formatter/linter. The `lint` gate runs Biome checks and must not introduce ESLint as a parallel linter.

Before merge:

```text
bun run lint
bun run typecheck
bun test
bun run build
```

Optional focused scripts may filter the Bun suite:

```text
bun run test:integration
bun run test:architecture
```

Browser E2E is not M0 gate until tool selection; it becomes pre-launch gate.

## 15. External smoke

Opt-in environment may test:

- one real Kie generation after model selection;
- external S3 round-trip;
- external PostgreSQL integration;
- Robokassa test mode;
- SMTP test delivery.

These are compatibility checks, not the primary regression suite.

## 16. Release gate MVP

Production launch blocked until:

- cross-user authorization clean;
- SMTP OTP delivery configured and verified;
- T3 Env validation covers production config;
- Robokassa signature/amount/idempotency behavior proven;
- credit concurrency and refunds proven;
- signup promo `+3` exactly once;
- FSD/Formisch/Valibot architecture checks pass;
- external PostgreSQL migration/backup procedure verified;
- S3 private;
- Kie model selected and benchmark accepted;
- critical browser E2E flows pass with approved tool;
- privacy/terms/AI limitation copy visible.
