# EGA Aluminium · Digital Product Passport Platform

A production-foundation, ESPR-aligned, multi-tenant DPP platform for Emirates
Global Aluminium and downstream customers.

> **Status** — foundation in place. End-to-end pipeline (simulator → signed DPP
> → public viewer) is wired and demoable. Sprint backlog continues per the
> Software Design Document (`EGA_DPP_SoftwareDocument.pdf`) and the version
> manifests workbook (`EGA_DPP_Version_Manifests.pdf`).

## Repo layout

```
ega-dpp-platform/
├── apps/
│   ├── api/              # FastAPI 0.115 · Python 3.12 · Pydantic v2 · SQLAlchemy 2.0 async
│   ├── web-public/       # Next.js 15 · public DPP viewer (editorial aesthetic, SSR, edge-cached)
│   └── web-console/      # Next.js 15 · all 6 authenticated surfaces with role-driven routing
├── packages/
│   ├── schema/           # Canonical JSON Schema 2020-12 + presets + validators · source of truth
│   ├── ui/               # Shared design system: tokens, Tailwind preset, primitives, motion utils
│   ├── viewer-blocks/    # (reserved) — extracted public-viewer animation blocks
│   ├── ts-types/         # (codegen target) — TS types generated from JSON schemas
│   ├── py-models/        # (codegen target) — Pydantic models generated from JSON schemas
│   └── sim/              # DPP simulator CLI + library
├── infra/
│   └── docker/           # docker-compose.yml — Postgres 17 + Redis 7 + MinIO + Mailhog
├── docs/
│   └── adr/              # Architecture Decision Records
└── scripts/              # Codegen, dev tooling
```

## Quick start

```bash
# 1. Install Node + pnpm + Python toolchain
nvm use                          # picks up .nvmrc → Node 20.18
corepack enable                  # provides pnpm 9
brew install uv                  # Python 3.12 + venv manager (or pipx install uv)

# 2. Bring up the local infrastructure
cp .env.example .env             # adjust if needed; defaults are dev-safe
pnpm infra:up                    # Postgres 17 + Redis 7 + MinIO + Mailhog

# 3. Install JS dependencies
pnpm install

# 4. Install Python dependencies + run the initial migration
cd apps/api
uv sync
uv run alembic upgrade head      # creates the schema, RLS policies, seeds EGA tenant
cd ../..

# 5. Validate canonical schemas
pnpm schema:validate

# 6. Run everything (in separate terminals or `pnpm dev` for parallel)
pnpm api:dev                     # FastAPI on :8000
pnpm --filter @dpp/web-public dev      # public viewer on :3000
pnpm --filter @dpp/web-console dev     # console on :3001

# 7. Fire your first DPP
pnpm sim:fire celestial-extrusion-billet-6063
# → returns a UPI; visit http://localhost:3000/dpp/<upi>
```

## What works today

- **Canonical schema** (`packages/schema/schemas/dpp/v1.0.0.json`) — JSON Schema
  Draft 2020-12 covering the 106 mandatory + recommended attributes for the
  trust-building DPP 1.0 manifest. Validates against ajv (Node) and jsonschema
  (Python).
- **Cast event → DPP pipeline** — POST a canonical cast event to
  `/api/v1/cast-events/`, the API validates, persists, generates a canonical DPP
  body, signs it with Ed25519 inside a W3C VC 2.0 envelope, writes a
  hash-chained audit-log entry, and returns the resolvable UPI. Total wall time
  on a laptop: ~150ms.
- **Public viewer** — server-rendered scroll-driven story with Hero, Story
  (comparison bars), Carbon (8-stage decomposition), Compliance (dark grid),
  Verification (cryptographic-signature ceremony with three-state button), and
  Footer. Honours `prefers-reduced-motion`. Sample routes available at
  `/dpp/sample/celestial`, `/dpp/sample/celestial-r`, `/dpp/sample/standard`.
- **Console** — Stripe-dashboard layout with role-driven default landing, live
  Pipeline activity feed, DPPs table, Sources tab with one-click "Fire event"
  against the simulator presets.
- **Multi-tenant data plane** — Postgres row-level security enforced on
  `cast_events`, `dpp_records`, `audit_log`. EGA seeded as `tenant_id=1`.
- **GS1 Digital Link resolver** — `/01/{gtin}/10/{batch}/21/{serial}` redirects
  to the public viewer; content-negotiates for JSON-LD.

## What's next (per the SDD sprint plan)

| Sprint | Weeks | Focus                                                 |
| ------ | ----- | ----------------------------------------------------- |
| 1      | 1–2   | ✅ Foundation                                         |
| 2      | 3–4   | ✅ Cast event flow                                    |
| 3      | 5–6   | DPP generator hardening (CFP enrichment, MTC linkage) |
| 4      | 7–8   | ✅ Signing + QR (PNG/SVG/ZPL ready in service layer)  |
| 5      | 9–10  | ✅ Public viewer + resolver                           |
| 6      | 11–12 | Customer Portal (5 zones, IMDS export, webhooks)      |
| 7      | 13–14 | Authority + Verifier + Audit                          |
| 8      | 15–16 | Super Admin + DPP Management Console + hardening      |

## Architecture notes

- **Two aesthetics, one design system.** All authenticated surfaces share the
  Stripe/Linear/Notion enterprise aesthetic (signature blue `#0F4C81`, Inter).
  The public viewer breaks from that with the editorial Apple Environmental
  Report aesthetic (Fraunces serif, desert-sun gold `#D4A574`). Both consume the
  same design tokens via `data-theme="enterprise"` and `data-theme="editorial"`
  on `<html>`. See `packages/ui/src/tokens/tokens.css`.
- **Schema is the contract.** `packages/schema/schemas/*.json` is the source of
  truth. Hand-authored TypeScript mirrors live in `packages/schema/src/types/`.
  Pydantic models are codegen'd into `apps/api/dpp_api/_generated/`. CI runs ajv
  validation against fixtures to keep them honest.
- **Ed25519, not ECDSA.** Per SDD §8.3 risk register — Ed25519 is conservative,
  widely supported, and aligns with W3C VC 2.0 Ed25519Signature2020.
- **Append-only everything.** Cast events, DPP records (revisions never
  overwrite), audit log (hash-chained). The DPP record table is the only one
  with `UPDATE` traffic, and only for lifecycle state transitions.
- **Multi-tenancy from day one.** `tenant_id` on every row, RLS enforced at the
  database, every request runs inside `SET LOCAL app.current_tenant_id`. EGA is
  `tenant_id=1`. Adding Hydro/Speira/Novelis is a tenant-onboarding workflow,
  not a code change.

## Useful commands

```bash
pnpm infra:up                    # bring up Postgres / Redis / MinIO / Mailhog
pnpm infra:reset                 # destroy volumes + start fresh
pnpm api:dev                     # start FastAPI with --reload
pnpm api:migrate                 # alembic upgrade head
pnpm dev                         # turbo run dev --parallel (everything)
pnpm schema:validate             # ajv-validate every schema in packages/schema
pnpm sim:fire celestial          # fire a CelestiAL preset against the API
pnpm typecheck                   # tsc across all packages
pnpm format                      # prettier write
```

## Where to read deeper

- `docs/adr/` — architecture decision records (locked decisions from §1-§14)
- `EGA_DPP_SoftwareDocument.pdf` — 86-page Software Design Document
- `EGA_DPP_Version_Manifests.pdf` — per-version attribute roster (DPP 1.0 → 4)
- Each app/package has its own `README.md` with surface-specific notes.

## Licence

UNLICENSED · proprietary platform foundation. Do not redistribute.
