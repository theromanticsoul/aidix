# Testing and quality gates

## 1. Test layers

```text
bun unit
  -> bun domain/application integration
    -> external database/storage integration where required
      -> architecture/FSD checks
        -> browser E2E (tool TBD, later checkpoint)
          -> opt-in external-provider smoke
```

Canonical JS/TS test runner is **`bun:test`**. Do not add Vitest or Jest without an explicit architecture decision.

Normal CI must not spend paid AI credits, create live Robokassa payments or depend on a production email provider.

## 2. Unit tests

Required domain coverage:

- generation cost calculation;
- insufficient balance;
- one-time signup promo grant amount exactly `+3` credits;
- repeated signup/promo path cannot grant another `+3`;
- refund idempotency;
- parent status derivation from variants;
- retry classification;
- project/user ownership policies;
- payment status transitions;
- purchase credit-grant idempotency.

Use `bun:test` assertions/mocks/snapshots where appropriate.

## 3. Database integration

AIDIX does not run PostgreSQL in Docker Compose.

Database integration tests that require real SQL semantics use an **explicitly configured external test PostgreSQL** via ENV. Do not substitute SQLite for PostgreSQL behavior that matters to transactions/locking.

Verify:

- transaction prevents double-spend under concurrent generation requests;
- worker claims each pending variant once using locking;
- duplicate valid Robokassa ResultURL notification cannot double-credit;
- duplicate refund cannot double-refund;
- signup promotion is one idempotent `PROMO_GRANT` with amount `+3`;
- FK/unique constraints match documented invariants.

Missing test database ENV must fail/skip according to the dedicated integration command contract; the repository must not silently start a local PostgreSQL container.

## 4. Storage integration

AIDIX does not run MinIO/local S3 in Docker. Normal CI uses a fake `ObjectStorage` adapter for application tests. A dedicated opt-in storage integration job uses an explicitly configured external S3-compatible test bucket from ENV.

Verify against the real test bucket:

- private object put/get;
- signed URL works and expires;
- provider-readable signed URL hostname is externally reachable in staging;
- deletion;
- content type;
- no public ACL;
- object key does not expose user email/original filename.

Missing S3 ENV must fail the external storage integration job instead of silently falling back to filesystem or MinIO.

## 5. Authentication / Email OTP tests

Better Auth Email OTP is the MVP auth mechanism.

Normal tests use a fake email sender and never depend on an external transactional email vendor.

Required coverage:

- requesting sign-in OTP invokes the email sender boundary;
- valid OTP creates/opens authenticated session according to Better Auth flow;
- invalid/expired OTP does not create authenticated session;
- first eligible successful auth creates exactly one `PROMO_GRANT` of `+3`;
- subsequent sign-ins do not repeat promo grant;
- no password auth route/UI is introduced;
- OTP value is not emitted to production logger paths;
- cross-user authorization still scopes data by authenticated user id.

Production email-provider integration tests are deferred until the owner selects a provider.

## 6. Kie.ai adapter contract tests

Use a fake HTTP server/fixture adapter matching the Kie port; normal CI must not spend Kie credits.

Required fixtures:

- `createTask` success returning `taskId`;
- 429 then successful submission;
- network timeout;
- Kie 5xx;
- valid signed callback;
- invalid HMAC callback;
- replay/duplicate callback;
- callback missed but `recordInfo` later reports success;
- task still processing;
- terminal policy/content failure;
- malformed `resultJson`;
- Kie task success followed by temporary S3 failure;
- successful result copied to S3 and provider URL discarded.

Assertions include exact variant lifecycle, callback idempotency, reconciliation behavior and credit/refund semantics.

## 7. Robokassa adapter contract tests

Normal CI uses fixtures/fake requests and does not create live payments.

Required coverage:

- checkout fields contain persisted `MerchantLogin`, canonical `OutSum`, stable `InvId` and a deterministic `SignatureValue` generated with Password #1;
- configured hash algorithm is used consistently and remains provider-adapter configuration;
- valid ResultURL notification signed with Password #2 is accepted;
- invalid ResultURL signature is rejected without changing payment/credits;
- unknown `InvId` is rejected;
- mismatched `OutSum` versus persisted payment amount is rejected;
- `Shp_*` parameters, when used, participate in signing/verifying in provider-required order;
- first valid ResultURL moves payment to `SUCCEEDED`, creates exactly one purchase credit-grant ledger entry and returns `OK{InvId}`;
- duplicate valid ResultURL remains idempotent and returns successful acknowledgement without another credit grant;
- SuccessURL request alone never transitions payment to `SUCCEEDED` and never grants credits;
- FailURL request alone never mutates a successful payment;
- Robokassa passwords never enter browser bundle or logs.

Paid catalog values are `TBD`; tests must use explicit fixture purchase snapshots rather than invented production prices/packages.

An opt-in integration test may use Robokassa test mode before M6/launch.

## 8. Prompt snapshot tests

For canonical room/style/reference inputs, snapshot normalized prompt payload and prompt version with `bun:test`.

Do not snapshot provider-generated pixels in normal tests.

Material prompt changes require deliberate snapshot review.

## 9. Image fixture benchmark

Maintain private or licensed benchmark set representing:

- bright/dark room;
- small room;
- furnished/empty room;
- windows/doors/radiator visible;
- modern/scandinavian/loft/classic styles;
- one furniture reference;
- one material reference;
- immutable instruction cases.

Before changing AI model snapshot or major prompt version, run manual/semiautomated evaluation for:

- source geometry preservation;
- style adherence;
- immutable element preservation;
- reference usefulness;
- severe artifacts;
- text/watermark artifacts;
- latency/cost.

No single subjective score is enough. Record sample outputs and regression notes outside canonical requirements.

## 10. Frontend architecture / FSD checks

CI must enforce the strict frontend architecture from `docs/implementation.md`.

Required checks:

- imports follow `1_app -> 2_pages -> 3_widgets -> 4_features -> 5_entities -> 6_shared` direction;
- slices of the same layer do not import each other directly;
- cross-slice imports use public API rather than internal paths;
- `src/app` remains thin and does not accumulate product components/business logic;
- forbidden root-level generic folders such as `components`, `hooks`, `utils`, `helpers`, `types` are not introduced as parallel architecture;
- React/FSD slices do not import Prisma, AWS SDK, Kie/Robokassa infrastructure clients directly;
- shadcn primitives remain under `src/6_shared/ui` and product-specific compositions do not leak into shared UI.

Prefer lint/import-boundary rules plus focused Bun architecture tests; code review alone is not sufficient.

## 11. Browser E2E decision

Browser E2E testing is useful for AIDIX because several risks only exist in a real browser: OTP auth navigation, uploads, client/server transitions, generation status UI and result interactions.

However, **no browser E2E framework is selected for M0**.

Canonical state:

```text
browser E2E needed before production launch: yes
framework/tool: TBD
Playwright: candidate, not approved dependency
Cypress/other tools: not selected
```

Decision checkpoint: before/while M3–M4 introduces the complete authenticated generation flow. At that point choose the smallest suitable browser tool based on Docker/Bun/CI compatibility and maintenance cost.

Target critical flows after the tool is chosen:

1. Email OTP sign-in with fake email sender;
2. initial balance shows `3` free promotional credits;
3. create project;
4. upload source photo;
5. configure generator;
6. submit generation using fake provider;
7. see queued/running/success state;
8. compare/download result;
9. insufficient credits -> billing CTA;
10. mocked valid Robokassa ResultURL -> balance increases exactly once;
11. SuccessURL without ResultURL confirmation -> payment remains pending/no credits;
12. technical generation failure -> refund visible.

## 12. Security tests

At minimum:

- user A cannot read/project/generation/asset of user B by ID;
- signed asset URL short-lived;
- unauthenticated generation endpoint rejected;
- OTP auth cannot be bypassed by client-supplied identity;
- MIME spoofed upload rejected;
- oversized upload rejected;
- XSS payload in project name/wishes rendered safely;
- Kie webhook without valid verification rejected;
- Kie replay webhook safe;
- Robokassa ResultURL with invalid signature rejected;
- Robokassa amount tampering rejected;
- no secret/OTP leaks in client bundle or production logs.

## 13. Build gates

Before merge:

```text
bun run lint
bun run typecheck
bun test
bun run build
```

Integration/architecture suites may be separated through scripts, but they must still use Bun's test runner, for example:

```text
bun run test:integration
bun run test:architecture
```

`lint`/architecture test suite must include FSD boundary enforcement.

Browser E2E is not an M0 gate until the tool decision is made. It becomes a pre-launch gate after implementation.

## 14. External smoke

Opt-in, manually triggered environment may run one small real Kie generation, external S3 round-trip, external PostgreSQL integration and Robokassa test-mode payment flow.

Email-provider smoke is added only after the production email provider is selected.

Smoke checks external compatibility only. It is not the primary regression suite and must be budget-capped.

## 15. Release gate MVP

Production launch blocked until:

- no known cross-user authorization issue;
- Email OTP production delivery provider selected/configured and auth flow verified;
- Robokassa ResultURL signature/amount/idempotency behavior proven;
- SuccessURL cannot grant credits;
- credit double-spend concurrency test passes;
- signup promotion grants exactly 3 credits once;
- generation failure refunds proven;
- strict FSD boundary checks pass;
- external PostgreSQL migrations/backup policy verified for the chosen deployment;
- object storage private;
- Kie launch model benchmark accepted;
- Kie webhook HMAC verification and missed-callback reconciliation proven;
- critical browser E2E flows pass using the later-approved tool;
- privacy/terms/AI limitation copy visible.
