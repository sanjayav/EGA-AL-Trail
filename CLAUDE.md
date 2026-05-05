# CLAUDE.md — engineering instructions for the EGA DPP platform

This file is loaded into every Claude Code session in this repo. It captures the
conventions and load-bearing decisions that aren't obvious from a single file
read.

## Read first

- `EGA_DPP_SoftwareDocument.pdf` — the 86-page SDD is the canonical product
  spec. When in doubt, the SDD wins. Locked decisions are listed in §15 Appendix
  A.
- `EGA_DPP_Version_Manifests.pdf` — per-version attribute roster. The schema in
  `packages/schema/schemas/dpp/v1.0.0.json` mirrors the DPP 1.0 manifest.
- `README.md` — the developer quick-start.

## Hard rules

1. **The JSON Schema is the contract.** Never change a TypeScript or Pydantic
   type without first changing `packages/schema/schemas/dpp/v1.0.0.json`. The
   schema is authoritative; codegen and hand-authored types must mirror it
   exactly.
2. **No new direct DB queries from the routers.** All persistence goes through
   `apps/api/dpp_api/services/*`. Routers translate HTTP ↔ service calls only.
3. **Multi-tenancy on every row.** `tenant_id` is non-nullable on every
   tenant-scoped table. RLS is `FORCE`d. Tests must verify isolation.
4. **Append-only first.** New mutation? Default to a new row, not an update. The
   only table that legitimately gets `UPDATE` traffic today is
   `dpp_records.state` for lifecycle transitions.
5. **Audit every mutation.** Every state-changing service call writes to
   `audit_log` via `services.audit.append_audit`. The hash chain is invariant.
6. **Honour `prefers-reduced-motion`** in every animated component. The CSS in
   `packages/ui/src/tokens/tokens.css` does this globally; never override it.
7. **Public Viewer must SSR.** No client-only components above the fold. Every
   above-the-fold pixel must paint without JavaScript.
8. **No ad-hoc colour or font tokens.** Use the CSS variables from
   `@dpp/ui/tokens.css`. New tokens must be added to that file with a comment
   pointing at the SDD section that motivated them.

## Where things live

| Concern                     | Path                                                   |
| --------------------------- | ------------------------------------------------------ |
| DPP schema (DPP 1.0)        | `packages/schema/schemas/dpp/v1.0.0.json`              |
| Cast event schema           | `packages/schema/schemas/cast-event/v1.0.0.json`       |
| W3C VC envelope schema      | `packages/schema/schemas/envelope/v1.0.0.json`         |
| EGA-anchored seed presets   | `packages/schema/presets/*.json`                       |
| Design tokens               | `packages/ui/src/tokens/tokens.css`                    |
| Public viewer page          | `apps/web-public/src/app/dpp/[...upi]/page.tsx`        |
| Console role-driven landing | `apps/web-console/src/lib/auth.ts` (`DEFAULT_LANDING`) |
| Cast event ingestion API    | `apps/api/dpp_api/routers/cast_events.py`              |
| DPP generator               | `apps/api/dpp_api/services/generator.py`               |
| W3C VC signer (Ed25519)     | `apps/api/dpp_api/services/signer.py`                  |
| Audit log hash chain        | `apps/api/dpp_api/services/audit.py`                   |
| End-to-end pipeline         | `apps/api/dpp_api/services/pipeline.py`                |

## Conventions

- **Python**: `ruff` for lint + format (line length 100, double quotes).
  `mypy --strict`. Async everywhere on the request path; sync only inside
  Alembic and CLI scripts.
- **TypeScript**: `tsc --noEmit` strict, `noUncheckedIndexedAccess: true`. No
  `any`. `unknown` + narrowing instead. Imports use the `.js` extension in
  source files (NodeNext / ESM).
- **Imports**: barrel files only at package boundaries (`@dpp/schema`,
  `@dpp/ui`). Inside a package, import directly from the file that owns the
  export.
- **Components**: prefer Server Components in Next.js. Mark Client Components
  with `'use client'` only when they need state, effects, or browser APIs.
- **Naming**:
  - Pydantic models: `PascalCase` matching the JSON Schema title.
  - SQLAlchemy table names: snake_case, plural (`dpp_records`).
  - React components: `PascalCase` files in `src/components/<surface>/`.
  - CSS variables: `--kebab-case`.
- **Commits**: imperative present tense ("add ed25519 signing", not "added").
  Scope by package (`api:`, `web-public:`, `schema:`, etc.).

## Testing posture

- Schema validation runs via `pnpm schema:validate` on every PR.
- API tests live under `apps/api/tests/` (pytest + httpx). Database tests use
  the live Postgres container; we don't mock SQLAlchemy.
- Public viewer accessibility: Lighthouse 100 is the contract. CI to be wired in
  Sprint 5.

## Things to ask before changing

- The 106-attribute schema. Adds are fine; renames or removals require an SDD
  amendment.
- The signer's canonicalisation (`canonicalise()` in `services/signer.py`).
  Switching to JCS or RDF Dataset Canonicalisation is a v1.5 change with EU
  Registry alignment.
- The role taxonomy in `apps/web-console/src/lib/auth.ts`. Mirrors SDD §12.1.1
  exactly; new roles need an SDD update first.

## Don't

- Don't add a "demo data" branch. Use the simulator presets — they ARE the
  trust-building data path.
- Don't hand-roll a CFP value anywhere. Fetch from `services/presets.py` or the
  (forthcoming) reference-data store.
- Don't import directly from `apps/web-public/*` into `apps/web-console/*`.
  Anything reused belongs in `packages/ui` or `packages/viewer-blocks`.
- Don't create new top-level routes outside the established surface map
  (`/console`, `/portal`, `/authority`, `/verifier`, `/admin`). Add tabs to the
  existing console layout instead.
