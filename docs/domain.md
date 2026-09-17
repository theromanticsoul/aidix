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
| `User` | Better Auth user/account identity. Product fields не дублируют auth credentials. |
| `Project` | `id`, `userId`, `name`, `defaultRoomType?`, timestamps, optional archivedAt. |
| `Asset` | Metadata owned file: `id`, `userId`, `projectId?`, `kind`, `storageKey`, `mime`, width/height, bytes, checksum, timestamps, deletedAt?. Public URL не хранится как canonical field. |
| `Generation` | One user request: `id`, `userId`, `projectId`, `sourceAssetId`, `operation`, room/style, wishes, immutableInstructions, requestedVariants, status, promptVersion, timestamps, creditReservationId. |
| `GenerationReference` | Ordered relation generation -> asset, `role = STYLE | FURNITURE | MATERIAL`, position. Max 3 in MVP. |
| `GenerationVariant` | One product output slot: `id`, `generationId`, index, status, outputAssetId?, `providerTaskId?`, provider/model metadata, `providerCallbackAt?`, safe errorCode?, latencyMs?, timestamps. `providerTaskId` is unique when present and maps Kie async task to exactly one variant. |
| `CreditLedgerEntry` | Append-only credit movement: `id`, `userId`, `type`, `amountSigned`, `generationId?`, `paymentId?`, idempotencyKey, createdAt. |
| `Payment` | Provider-neutral incoming payment projection: amount/currency, packageCode, status, providerRef, idempotency metadata, timestamps. |
| `ProviderEvent` | Dedup inbox for payment webhooks. Kie image callbacks do not become product state themselves: verified callback marks the matching variant by `providerTaskId` as ready for immediate reconciliation; authoritative task state is read from Kie task-detail API. |

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
- terminal generation never returns to `QUEUED`; retry creates/reopens only failed variant attempts under controlled retry metadata, not a second product charge.

Variant lifecycle:

```text
PENDING -> RUNNING -> SUCCEEDED
                   -> FAILED_RETRYABLE -> RUNNING
                   -> FAILED_TERMINAL
```

Maximum automatic provider attempts per variant: `3` total attempts unless provider-specific rate-limit policy delays without counting as an attempt.

Kie-specific rule: successful `createTask` stores `providerTaskId` and keeps the variant `RUNNING` until task-detail reconciliation confirms terminal result. Callback receipt alone never sets `SUCCEEDED`. A missed callback does not fail the variant while reconciliation can still obtain authoritative provider state.

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

At creation:

1. calculate cost;
2. atomically verify available balance;
3. append negative `GENERATION_CHARGE` ledger entry;
4. create Generation + variants;
5. commit;
6. only then external work begins.

Refund semantics:

- each variant that reaches `FAILED_TERMINAL` because of system/provider failure receives `+1` `GENERATION_REFUND`;
- user-visible safety rejection/unsupported input policy may be refundable according to failure classification in testing/implementation; default is refund unless useful output was produced;
- `PARTIAL` therefore charges only successful terminal variants after refunds settle;
- manual cancel before a provider request starts refunds unstarted variants;
- deleting a successful image never refunds credits.

## 7. Ledger invariants

Allowed entry types MVP:

```text
PROMO_GRANT
PACKAGE_PURCHASE
GENERATION_CHARGE
GENERATION_REFUND
MANUAL_ADJUSTMENT
PAYMENT_REVERSAL
```

Rules:

- `amountSigned != 0`;
- immutable after insert;
- every business operation has stable unique `idempotencyKey`;
- balance = sum all ledger amounts for user;
- cached balance may exist for performance but must be transactionally consistent or rebuildable.

Promotional signup grant unique by `(userId, PROMO_SIGNUP_V1)`.

## 8. Payment lifecycle

Provider-neutral:

```text
PENDING -> SUCCEEDED
        -> CANCELED
        -> FAILED

SUCCEEDED -> REFUNDED | PARTIALLY_REFUNDED
```

Credits are granted only on authoritative `SUCCEEDED` confirmation.

Redirect return from payment page is not authoritative. Application fetches provider status and/or processes authenticated webhook.

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
- provider/model/snapshot used on each variant.

Full raw provider response is not canonical domain data and should not be stored indefinitely.

## 12. Indexes

Required indexes/constraints:

- Project `(userId, updatedAt desc)`;
- Asset `(userId, projectId, createdAt desc)`;
- Generation `(userId, projectId, createdAt desc)`;
- Variant unique `(generationId, index)`;
- Ledger `(userId, createdAt desc)`;
- Ledger unique `idempotencyKey`;
- Payment unique `(providerCode, providerPaymentId)` when provider id exists;
- ProviderEvent unique `(providerCode, externalEventId)`.
