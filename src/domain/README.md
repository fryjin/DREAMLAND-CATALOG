# DREAMLAND Domain Layer

R4 introduces a framework-agnostic `domain` layer for stable business policy.

## Dependency rule

```text
app       → features / ui / services / domain / data
features  → ui / services / domain / data
services  → domain / data
domain    → no higher-layer dependency
ui        → no higher-layer dependency
data      → no higher-layer dependency
```

Domain modules must remain:

- DOM-free;
- storage-free;
- network-free;
- framework-agnostic;
- deterministic from explicit inputs.

## R4.2A owner

```text
src/domain/pricing/runtime-pricing-policy.js
```

Owns the shared pricing, MOQ, quantity and currency policy that was previously
implemented directly inside `index.html`.

The legacy page keeps thin wrapper functions during migration so existing
Features, Presentations and validators retain their current contracts.


## R4.2B owner

```text
src/domain/submission/runtime-submission-payload.js
```

Owns deterministic provider-delivery payload mapping and payload validation
previously implemented inside `index.html`.

The Domain receives a canonical `DreamlandInquiry.buildProjection()` result and
returns the existing delivery payload shape. It does not perform network
transport, Risk assessment, CAPTCHA handling, persistence or DOM feedback.
