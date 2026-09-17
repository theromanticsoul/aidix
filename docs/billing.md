# Billing and credits

## 1. Commercial model MVP

MVP uses **one-time credit packages**, not subscriptions.

Reason: user demand around renovation is episodic; one-time packages are simpler to explain, implement and support. Subscription may be added after usage data shows recurring professional demand.

## 2. Credit semantics

One successful standard photo-redesign variant consumes `1 credit`.

A request for N variants reserves/charges N credits.

Credits are internal product units, not upstream provider tokens and not tied to a specific AI vendor.

## 3. Signup promotion

Verified/new eligible account receives **`3` free promotional credits once**. Product/UI copy may call this **3 бесплатные генерации**, because one standard generated variant costs one credit.

The same three credits may be spent on three single-variant requests or on one/more multi-variant requests. For example, a request for three variants consumes all three promotional credits.

Abuse controls may require email verification, rate limits and additional anti-fraud checks. Product must not silently grant repeat promotional credits after account recreation using the same verified identity where a reliable signal exists.

## 4. Package catalog

Initial package values are product configuration and should be stored in code/database seed with stable `packageCode`.

Proposed launch set for validation:

| Package | Credits | Price |
| --- | ---: | ---: |
| `START` | 20 | 590 ₽ |
| `PLUS` | 60 | 1 490 ₽ |
| `PRO` | 200 | 3 990 ₽ |

These values are an initial commercial hypothesis. Changing price/quantity is a product decision and must update this document before release configuration.

No auto-renewal in MVP.

## 5. Payment provider — Robokassa

Production payment provider MVP: **Robokassa**.

Canonical checkout flow:

1. user chooses a package;
2. server creates internal `Payment` in `PENDING` with stable internal invoice/order id;
3. server builds Robokassa payment parameters including `MerchantLogin`, `OutSum`, `InvId` and `SignatureValue` using Password #1;
4. browser is redirected/submitted to Robokassa payment interface;
5. Robokassa sends authoritative server notification to configured `ResultURL`;
6. AIDIX verifies `SignatureValue` for ResultURL using Password #2, verifies invoice identity and expected amount, then processes the notification idempotently;
7. after successful processing AIDIX returns `OK{InvId}` to Robokassa;
8. one idempotent `PACKAGE_PURCHASE` ledger entry grants package credits;
9. `SuccessURL` and `FailURL` are user redirect surfaces only and never grant credits by themselves.

The internal payment state is the AIDIX source of truth. Browser return from Robokassa must only display/reload that state.

## 6. Robokassa signature boundary

Provider-specific signature construction and validation belong only to the Robokassa infrastructure adapter.

Minimum rules:

- checkout signature uses configured Password #1;
- ResultURL verification uses configured Password #2;
- signature/hash algorithm is configuration matching Robokassa merchant technical settings, not hardcoded into domain logic;
- `Shp_*` parameters, if used, must be included in signature construction/verification in the exact canonical order required by Robokassa;
- compare normalized signature values safely and reject mismatches;
- ResultURL handler must verify that `InvId` exists and that `OutSum` matches the internal expected payment amount before granting credits.

Do not expose either Robokassa password to browser code or `NEXT_PUBLIC_*` variables.

## 7. Idempotency

Payment creation has a stable internal business key / invoice id.

ResultURL processing must be idempotent by internal payment / `InvId`. Repeated valid notifications must return the expected successful acknowledgement without issuing another credit grant.

Credit grant unique key example:

```text
payment-credit:<internalPaymentId>
```

Repeated ResultURL notifications cannot grant additional credits.

## 8. Redirect semantics

Robokassa surfaces:

- `ResultURL` — authoritative server-to-server successful-payment notification for AIDIX billing state;
- `SuccessURL` — browser redirect after successful payment UX;
- `FailURL` — browser redirect after failed/canceled payment UX.

AIDIX never marks a payment `SUCCEEDED` or grants credits solely because a user opened `SuccessURL`.

## 9. Refunds

### Generation failure

Technical generation refunds are **credit refunds**, not payment refunds, and follow `docs/domain.md`.

### Monetary payment refund

Payment refund is support/admin flow, not self-service MVP.

If monetary refund reverses unused purchased credits, system creates a `PAYMENT_REVERSAL` ledger movement. If user has already consumed credits, support policy must decide whether partial monetary refund is allowed; do not make ledger negative implicitly without explicit admin decision.

Exact Robokassa refund/operation procedure must be implemented against the provider's current documented API at implementation time; do not infer it from checkout semantics.

## 10. Expiration

Purchased credits do not expire in MVP unless legal/business policy explicitly changes.

Promotional credits may have future expiry, but signup promotion v1 has no expiry to avoid separate expiry accounting in initial implementation.

## 11. Currency/taxes/receipts

MVP storefront currency: RUB.

Fiscal receipt/VAT configuration depends on the merchant's legal/tax setup and Robokassa merchant configuration and must be confirmed before production payments. Do not invent tax treatment or receipt parameters in engineering code/docs before that business/legal decision.

Robokassa receipt payload details stay inside the payment adapter so tax/fiscalization configuration can change without touching credit domain logic.

## 12. Admin adjustments

Manual credit adjustment requires:

- authenticated admin-only path (can initially be CLI/script, not UI);
- reason;
- actor identifier;
- append-only `MANUAL_ADJUSTMENT` entry.

Never edit/delete ledger rows to fix balance.
