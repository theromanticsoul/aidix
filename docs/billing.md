# Billing and credits

## 1. Commercial model

Credits are the canonical internal unit consumed by generation operations.

The exact paid catalog structure is **TBD** until an explicit owner decision before M6. Documentation and implementation must not invent:

- package names;
- credits per package;
- prices;
- discounts;
- subscription/autorenewal semantics;
- promotional paid offers.

Robokassa is the selected payment provider, but provider choice does not define the commercial catalog.

## 2. Credit semantics

One successful standard photo-redesign variant consumes `1 credit`.

A request for N variants reserves/charges N credits.

Credits are internal product units, not upstream provider tokens and not tied to a specific AI vendor.

## 3. Signup promotion

Verified/new eligible account receives **`3` free promotional credits once**. Product/UI copy may call this **3 бесплатные генерации**, because one standard generated variant costs one credit.

The same three credits may be spent on three single-variant requests or on one/more multi-variant requests. For example, a request for three variants consumes all three promotional credits.

The promo is granted only after successful first Email OTP authentication/verification according to the auth flow. Product must not silently grant repeat promotional credits after account recreation using the same verified identity where a reliable signal exists.

## 4. Paid catalog — TBD

Paid catalog values are not yet approved.

Canonical state:

```text
package names: TBD
credits per package: TBD
prices: TBD
subscription/autorenewal: TBD
```

Do not seed production package values until this document is updated from an explicit owner decision.

M0–M5 implementation may keep the billing domain/provider boundary without a production purchasable catalog. M6 cannot be completed until the paid catalog decision is made.

## 5. Payment provider — Robokassa

Production payment provider MVP: **Robokassa**.

Canonical checkout flow once a paid catalog exists:

1. user chooses an approved purchasable item/package;
2. server creates internal `Payment` in `PENDING` with stable internal invoice/order id and immutable purchase snapshot;
3. server builds Robokassa payment parameters including `MerchantLogin`, `OutSum`, `InvId` and `SignatureValue` using Password #1;
4. browser is redirected/submitted to Robokassa payment interface;
5. Robokassa sends authoritative server notification to configured `ResultURL`;
6. AIDIX verifies `SignatureValue` for ResultURL using Password #2, verifies invoice identity and expected amount, then processes the notification idempotently;
7. after successful processing AIDIX returns `OK{InvId}` to Robokassa;
8. one idempotent credit-grant ledger entry grants exactly the purchased credit amount from the immutable purchase snapshot;
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

Payment refund policy/UX is **TBD** until the commercial catalog and support policy are approved.

If monetary refunds are implemented, ledger history remains append-only. Never delete original purchase/consumption ledger rows to simulate a refund.

Exact Robokassa refund/operation procedure must be implemented against the provider's current documented API at implementation time; do not infer it from checkout semantics.

## 10. Expiration

Purchased-credit expiration policy is `TBD` until the paid catalog is approved.

Signup promotional credits do not expire in MVP unless an explicit owner decision changes this behavior.

## 11. Currency/taxes/receipts

Storefront currency, tax/VAT and fiscal receipt configuration remain **TBD** until owner/legal/merchant configuration is explicitly confirmed. Do not infer them from the choice of Robokassa or from earlier draft values.

Robokassa receipt payload details stay inside the payment adapter so fiscalization configuration can change without touching credit domain logic.

## 12. Admin adjustments

Manual credit adjustment requires:

- authenticated admin-only path (can initially be CLI/script, not UI);
- reason;
- actor identifier;
- append-only `MANUAL_ADJUSTMENT` entry.

Never edit/delete ledger rows to fix balance.
