# Testing and quality gates

## 1. Test layers

```text
unit
  -> domain/application integration
    -> database/storage integration
      -> browser E2E
        -> opt-in external-provider smoke
```

Normal CI must not spend paid AI credits or create real payments.

## 2. Unit tests

Required domain coverage:

- generation cost calculation;
- insufficient balance;
- one-time promo grant;
- refund idempotency;
- parent status derivation from variants;
- retry classification;
- project/user ownership policies;
- payment status transitions;
- package credit grant idempotency.

## 3. Database integration

Use real PostgreSQL in CI/service container, not SQLite substitute.

Verify:

- transaction prevents double-spend under concurrent generation requests;
- worker claims each pending variant once using locking;
- duplicate payment webhook cannot double-credit;
- duplicate refund cannot double-refund;
- FK/unique constraints match documented invariants.

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

## 5. Kie.ai adapter contract tests

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

## 6. Prompt snapshot tests

For canonical room/style/reference inputs, snapshot normalized prompt payload and prompt version.

Do not snapshot provider-generated pixels in normal tests.

Material prompt changes require deliberate snapshot review.

## 7. Image fixture benchmark

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

## 8. E2E browser tests

Critical Playwright flows:

1. signup/login;
2. free credit visible;
3. create project;
4. upload source photo;
5. configure generator;
6. submit generation using fake provider;
7. see queued/running/success state;
8. compare/download result;
9. insufficient credits -> billing CTA;
10. mocked payment success -> balance increases;
11. technical generation failure -> refund visible.

## 9. Security tests

At minimum:

- user A cannot read/project/generation/asset of user B by ID;
- signed asset URL short-lived;
- unauthenticated generation endpoint rejected;
- MIME spoofed upload rejected;
- oversized upload rejected;
- XSS payload in project name/wishes rendered safely;
- webhook without valid provider verification rejected;
- replay webhook safe;
- no secret leaks in client bundle.

## 10. Build gates

Before merge:

```text
bun run lint
bun run typecheck
bun run test
bun run test:integration
bun run build
```

For UI-affecting PRs:

```text
bun run test:e2e
```

## 11. External smoke

Opt-in, manually triggered environment may run one small real Kie generation, external S3 round-trip and payment sandbox flow.

Smoke checks external compatibility only. It is not the primary regression suite and must be budget-capped.

## 12. Release gate MVP

Production launch blocked until:

- no known cross-user authorization issue;
- payment webhook idempotency proven;
- credit double-spend concurrency test passes;
- generation failure refunds proven;
- object storage private;
- Kie launch model benchmark accepted;
- Kie webhook HMAC verification and missed-callback reconciliation proven;
- privacy/terms/AI limitation copy visible;
- backup/restore for PostgreSQL tested.
