# Domain model

## 1. Ownership

```text
User
├── Project
│   ├── Asset
│   └── Generation
│       ├── GenerationReference -> Asset
│       └── GenerationVariant -> Asset
├── CreditLedgerEntry
└── Payment
```

MVP single-user: organization/team tenancy отсутствует.

Каждый query пользовательских данных обязан быть ограничен authenticated `userId`. Знание UUID чужого resource не даёт доступ.

## 2. Entities

| Entity | Назначение и ключевые поля |
| --- | --- |
| `User` | Better Auth user/account identity. Product fields не дублируют auth credentials. MVP authentication is Email OTP. |
| `Project` | `id`, `userId`, `name`, `defaultRoomType?`, timestamps, optional archivedAt. |
| `Asset` | Metadata owned file: `id`, `userId`, `projectId?`, `kind`, `storageKey`, `mime`, width/height, bytes, checksum, timestamps, deletedAt?. Public URL не хранится как canonical field. |
| `Generation` | One user request: `id`, `userId`, `projectId`, `sourceAssetId`, `operation`, room/style, wishes, immutableInstructions, requestedVariants, status, promptVersion, timestamps, creditReservationId. |
| `GenerationReference` | Ordered relation generation -> asset, `role = STYLE | FURNITURE | MATERIAL`, position. Max 3 in MVP. |
| `GenerationVariant` | One product output slot: `id`, `generationId`, index, status, outputAssetId?, `providerTaskId?`, provider/model metadata, callback/reconciliation metadata, safe errorCode?, latencyMs?, timestamps. `providerTaskId` is unique when present and maps one provider task to exactly one variant. |
| `CreditLedgerEntry` | Append-only credit movement: `id`, `userId`, `type`, `amountSigned`, `generationId?`, `paymentId?`, idempotencyKey, createdAt. |
| `Payment` | Provider-neutral payment projection: `id`, `userId`, expected amount/currency when approved, optional `purchaseCode`/immutable purchase snapshot, status, providerRef/invoice identity, idempotency metadata, timestamps. Exact paid catalog shape is `TBD`. |
| `ProviderEvent` | Dedup inbox for provider payment notifications where needed. Kie callbacks are completion hints/reconciliation triggers and do not directly become product success state. |

## 3. Asset kinds

```text
SOURCE_ORIGINAL
SOURCE_NORMALIZED
REFERENCE
GENERATED
THUMBNAIL
MASK          # V1.1
UPSCALED      # V1.1
```

`Asset.kind` describes product purpose, not storage bucket.

## 4. Generation lifecycle

```text
DRAFT
  -> QUEUED
  -> RUNNING
  -> SUCCEEDED
  -> PARTIAL
  -> FAILED
  -> CANCELED
```

Rules:

- `DRAFT` exists only while creating request server-side and must not remain visible after failed transaction.
- `QUEUED` means credit reserved/charged and worker may claim.
- `RUNNING` means at least one variant claimed/provider call in progress.
- terminal: `SUCCEEDED | PARTIAL | FAILED | CANCELED`.
- terminal generation never returns to `QUEUED`; retry operates on failed/retryable variant attempts under controlled retry metadata, not as a second product charge.

Variant lifecycle:

```text
PENDING -> RUNNING -> SUCCEEDED
                   -> FAILED_RETRYABLE -> RUNNING
                   -> FAILED_TERMINAL
```

Automatic retry count/backoff is implementation configuration, not a product constant. It must not cause duplicate product charges.

Kie-specific domain rule: provider task acceptance stores `providerTaskId` and keeps the variant non-terminal. Callback receipt alone never sets `SUCCEEDED`. Variant success requires authoritative provider completion plus successful copy of the result into AIDIX-owned S3. Exact callback/task-detail mechanics depend on the owner-approved Kie model/API contract.

## 5. Parent status derivation

Parent generation status is derived from variants:

- all `SUCCEEDED` => `SUCCEEDED`;
- at least one `SUCCEEDED`, all others terminal => `PARTIAL`;
- zero success, all terminal => `FAILED`;
- any work active => `RUNNING`/`QUEUED`.

Do not manually set parent success independently from variant states.

## 6. Credit model

One MVP `REDESIGN_PHOTO` generation costs credits per requested variant:

```text
cost = requestedVariants * CREDIT_COST_REDESIGN_VARIANT
```

Initial canonical value: `1 credit / variant`.

A request for 4 variants costs 4 credits.

A newly eligible account receives one idempotent signup `PROMO_GRANT` with `amountSigned = +3` after successful first Email OTP authentication. Product/UI presents this balance as **3 бесплатные генерации**. It is one business grant of three credits, not three separately repeatable grant operations.

At generation creation:

1. calculate cost;
2. atomically verify available balance;
3. append negative `GENERATION_CHARGE` ledger entry;
4. create Generation + variants;
5. commit;
6. only then external work begins.

Refund semantics:

- each variant that reaches `FAILED_TERMINAL` because of system/provider failure receives matching `GENERATION_REFUND` credit restoration;
- user-visible safety rejection/unsupported input policy is refundable by default unless useful output was produced or an explicit policy changes this rule;
- `PARTIAL` therefore charges only successful terminal variants after refunds settle;
- manual cancel before provider work starts refunds unstarted variants;
- deleting a successful image never refunds credits.

## 7. Ledger invariants

Allowed entry types MVP:

```text
PROMO_GRANT
PURCHASE_GRANT
GENERATION_CHARGE
GENERATION_REFUND
MANUAL_ADJUSTMENT
PAYMENT_REVERSAL
```

`PURCHASE_GRANT` is intentionally catalog-neutral. It grants the exact approved credit amount stored in the immutable successful purchase/payment snapshot; it does not imply a particular package structure.

Rules:

- `amountSigned != 0`;
- immutable after insert;
- every business operation has stable unique `idempotencyKey`;
- balance = sum all ledger amounts for user;
- cached balance may exist for performance but must be transactionally consistent or rebuildable.

Promotional signup grant unique by `(userId, PROMO_SIGNUP_V1)` and has canonical amount `+3` credits.

## 8. Payment lifecycle

Provider-neutral lifecycle:

```text
PENDING -> SUCCEEDED
        -> CANCELED
        -> FAILED

SUCCEEDED -> REFUNDED | PARTIALLY_REFUNDED
```

Credits are granted only on authoritative successful payment confirmation.

For MVP Robokassa, authoritative success comes from verified server-side ResultURL processing. Browser `SuccessURL` is never authoritative.

Exact catalog, price, currency and refund/fiscal semantics remain `TBD` until explicit owner decisions documented in `docs/billing.md`.

## 9. Project deletion

Project delete is soft-delete/archive in UI by default.

Permanent deletion path:

1. mark project deleting;
2. prevent new generations;
3. remove/de-reference metadata;
4. enqueue/perform object deletion;
5. finalize deleted state.

Payment/ledger records required for accounting are not removed with project.

## 10. Account deletion

Account deletion removes user-owned projects/generation/assets and auth identity according to privacy policy, while financial records may require retention according to legal/accounting obligations. Stored financial record should minimize personal data.

## 11. Prompt snapshot

Generation persists enough normalized data to explain output:

- `promptVersion`;
- `styleCode` + `styleVersion`;
- room type;
- sanitized wishes;
- immutable instructions;
- ordered reference roles;
- provider/model identifier used on each variant.

Full raw provider response is not canonical domain data and should not be stored indefinitely.

## 12. Indexes

Required indexes/constraints:

- Project `(userId, updatedAt desc)`;
- Asset `(userId, projectId, createdAt desc)`;
- Generation `(userId, projectId, createdAt desc)`;
- Variant unique `(generationId, index)`;
- Variant unique `providerTaskId` when present;
- Ledger `(userId, createdAt desc)`;
- Ledger unique `idempotencyKey`;
- Payment unique provider invoice/reference identity when present;
- ProviderEvent unique `(providerCode, externalEventId)` when an external event identity exists.
