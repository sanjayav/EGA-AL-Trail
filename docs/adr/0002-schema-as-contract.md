# ADR 0002 · JSON Schema as the canonical contract

**Status** Accepted · 2026-05-04

## Context

A DPP platform with 229 attributes spanning regulator-defensible claims (carbon
footprint, recycled content, compliance status) cannot tolerate type-system
drift between the backend and the frontends. A single misaligned field is a
regulatory finding waiting to happen.

We have three choices for the canonical type definition:

1. **Pydantic models** — Python-native, but TypeScript codegen is awkward.
2. **TypeScript types** — JS-native, but Python codegen is awkward.
3. **JSON Schema (Draft 2020-12)** — language-agnostic, with mature codegen on
   both sides + runtime validation in any language + IDE tooling support.

## Decision

JSON Schema Draft 2020-12 is the source of truth. Hand-authored TypeScript types
in `packages/schema/src/types/` mirror the schema and serve as the load-bearing
surface for application code. Pydantic models are generated into
`apps/api/dpp_api/_generated/` via `datamodel-code-generator`.

Rationale:

- Same artefact validates inbound payloads at every system boundary (API
  ingestion, viewer rendering, simulator output, codegen pipelines).
- Aligns with the W3C VC ecosystem (every VC has a canonical schema).
- Future EU DPP Registry will publish schemas — using JSON Schema today
  positions us for direct interop.
- Forward-compatible by design (DPP 1.0 → 1.5 → 2 → 3 → 4 add attributes without
  breaking existing consumers).

## Consequences

- Adding a field is a three-step ritual: (1) edit the schema, (2) update the
  hand-authored TS types, (3) re-run codegen for Pydantic. CI verifies all three
  are aligned.
- We accept the cost of writing types twice (schema + TS) for the benefit of IDE
  autocomplete and compile-time safety in TypeScript. Generated TS types are
  auxiliary, used only by external consumers.
- The schema's `$id` is a URL we will eventually serve at
  `https://schemas.dpp.ega.ae/dpp/v1.0.0.json` so external systems can reference
  it directly.
