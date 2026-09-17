# Billing and credits

## 1. Commercial model MVP

MVP uses **one-time credit packages**, not subscriptions.

Reason: user demand around renovation is episodic; one-time packages are simpler to explain, implement and support. Subscription may be added after usage data shows recurring professional demand.

## 2. Credit semantics

One successful standard photo-redesign variant consumes `1 credit`.

A request for N variants reserves/charges N credits.

Credits are internal product units, not upstream provider tokens and not tied to a specific AI vendor.

## 3. Signup promotion

Verified/new eligible account receives `1` free credit once.

Abuse controls may require email verification, rate limits and additional anti-fraud checks. Product must not silently grant repeat credits after account recreation using the same verified identity where a reliable signal exists.

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

## 5. Payment provider

Initial Russia payment adapter: ЮKassa.

User flow:

1. choose package;
2. server creates internal Payment `PENDING`;
3. server creates provider payment with idempotency key;
4. user redirects to provider confirmation;
5. return URL shows pending/succeeded status but does not grant credits based only on redirect;
6. authenticated provider webhook and/or server-side status fetch confirms `SUCCEEDED`;
7. idempotent `PACKAGE_PURCHASE` ledger entry grants credits.

## 6. Idempotency

Payment creation has stable business key.

Webhook processing unique by provider event/payment identity.

Credit grant unique key example:

```text
payment-credit:<internalPaymentId>
```

Repeated webhooks cannot grant additional credits.

## 7. Refunds

### Generation failure

Technical generation refunds are **credit refunds**, not payment refunds, and follow `docs/domain.md`.

### Monetary payment refund

Payment refund is support/admin flow, not self-service MVP.

If monetary refund reverses unused purchased credits, system creates a `PAYMENT_REVERSAL` ledger movement. If user has already consumed credits, support policy must decide whether partial monetary refund is allowed; do not make ledger negative implicitly without explicit admin decision.

## 8. Expiration

Purchased credits do not expire in MVP unless legal/business policy explicitly changes.

Promotional credits may have future expiry, but signup credit v1 has no expiry to avoid separate expiry accounting in initial implementation.

## 9. Currency/taxes/receipts

MVP storefront currency: RUB.

Fiscal receipt/VAT configuration depends on the merchant's legal/tax setup and must be confirmed before production payments. Do not hardcode tax treatment based solely on this engineering document.

Payment provider payload should be isolated in adapter so receipt configuration can change without touching credit domain logic.

## 10. Admin adjustments

Manual credit adjustment requires:

- authenticated admin-only path (can initially be CLI/script, not UI);
- reason;
- actor identifier;
- append-only `MANUAL_ADJUSTMENT` entry.

Never edit/delete ledger rows to fix balance.
