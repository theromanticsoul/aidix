# Research snapshot — 2026-09-17

This document is **non-canonical**. It records market/technology observations used to choose the first scope. External products and prices can change.

## 1. Competitors

### Domvisor Design

URL: https://domvisor.ru/design

Observed flow: upload photo -> room type/style -> generate/download. Strong before/after landing, many styles, multiple audience segments and credit/package pricing.

Lesson: simple main flow is enough to communicate value; long SEO content supports acquisition but does not need a complex application architecture.

### HomeVisual

URL: https://homevisual.ru/

Observed positioning: result by photo, before/after, interior/facade/landscape, style catalog, credit packages/subscriptions.

Lesson: user wants a fast visual decision, not a design-theory tool. AIDIX should keep interior scope narrow first rather than launch exterior/landscape simultaneously.

### Room-design.ai

URL: https://room-design.ai/

Observed flow: photo -> room type -> style -> generate, with purchased generation packs.

Lesson: lowest-friction generator can be extremely small.

### Intora

URL: https://intora-design.ru/generator/interior

Observed: photo, room type, style, optional details, reference images, standard/pro modes, private generation, targeted editing.

Lesson: references and edit modes are meaningful differentiators after base generation works.

### Interior-AI

URL: https://interior-ai.ru/

Observed: photo redesign, texture/furniture references, empty-room/removal/lighting transformations, sketch/render claims, floor-plan capability described as developing.

Lesson: specialized edit tools can become a second layer; plan generation should not be overpromised.

### ArchyBase

URL: https://www.archybase.com/ru/ai-interior-generator

Observed: text-to-interior entry point plus broader suite including floor plans, 2D/3D and architecture tools.

Lesson: this is a broader platform model; AIDIX should not copy platform breadth before validating core photo flow.

### Room Design AI

URLs: https://roomdesignai.org/ and https://roomdesignai.com/

Observed positioning strongly emphasizes preserving the user's walls/windows/floor-plan while changing decor/finishes and exposes multiple purpose-built edit tools.

Lesson: "this is still your room" is a stronger product promise than generic text-to-image beauty.

## 2. Common market pattern

Repeated core path:

```text
photo
-> room type
-> style
-> optional wishes
-> generation
-> compare/download
```

Common monetization: first free generation/credits, then packages or subscriptions.

Common differentiators after core:

- references;
- targeted edit;
- upscale;
- virtual staging/empty room;
- surfaces/material changes;
- floor-plan/3D claims.

This supports a narrow AIDIX MVP.

## 3. Image provider research

### Kie.ai — selected API gateway

Product: https://kie.ai/ru

Docs:

- https://docs.kie.ai/
- https://docs.kie.ai/market/gpt/gpt-image-2-image-to-image
- https://docs.kie.ai/43286923e0
- https://docs.kie.ai/market/common/get-task-detail
- https://docs.kie.ai/common-api/webhook-verification

Owner decision after the initial research: AIDIX will use **Kie.ai as the image-generation API**, rather than integrating model vendors directly. Kie exposes multiple image models behind a common asynchronous task API.

Important integration observations as of the snapshot date:

- generation is asynchronous: task creation returns a `taskId`; completion must be received by callback or queried through task details;
- production callbacks support HMAC-SHA256 verification through `X-Webhook-Timestamp` and `X-Webhook-Signature`;
- generated provider media/URLs are temporary, so AIDIX must copy successful results into its own S3 storage;
- Kie recommends callbacks for production and task-detail polling/reconciliation remains necessary for reliability;
- GPT Image 2.5 Sunburst image-to-image is available through model id `gpt-image-2-5-sunburst-image-to-image`;
- Kie image-to-image payloads accept remote input URLs, which maps cleanly to short-lived signed S3 URLs for the room photo and references.

Initial implementation choice: use Kie.ai with `gpt-image-2-5-sunburst-image-to-image`, while keeping the model id configurable through ENV and benchmark-gated. This preserves the original image-edit quality direction without a direct OpenAI integration.

### Other Kie models

Kie currently exposes alternatives including GPT Image 2, Nano Banana 2, Flux variants, Qwen and others. They are evaluation candidates, not automatic fallbacks. AIDIX should not implement model routing or fallback logic before benchmark data proves a need.

## 4. Web stack research

Next.js App Router remains appropriate for a single full-stack product and current docs explicitly cover AI coding agent guidance. Better Auth supports Next.js and basic email/password/social sessions.

AIDIX therefore uses one web application rather than a separate Hono/API app as in RECOMS.

## 5. Payment research

ЮKassa exposes payment API, webhooks/callbacks, refunds, cards and SBP for Russian merchants. It is a reasonable first adapter for a RUB storefront.

Domain remains provider-neutral because legal/merchant/provider conditions may change.

## 6. Deliberate differences from RECOMS

RECOMS needs:

- public external API;
- multi-tenant organizations;
- cloud/self-hosted editions;
- moderation/billing control plane;
- multiple independently deployed apps.

AIDIX MVP does not.

Therefore AIDIX intentionally avoids:

- monorepo package graph unless code size later justifies it;
- separate public API service;
- organizations/roles;
- multiple editions;
- broad operational plane;
- microservice-style boundaries.

It keeps the part of RECOMS that matters most for LLM development: canonical docs, explicit invariants, provider-neutral ports, specification lock and verification gates.
