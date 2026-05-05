# ADR 0001 · Monorepo with pnpm + Turborepo

**Status** Accepted · 2026-05-04 **Owners** DPP Service Provider Engineering

## Context

The platform ships a backend (FastAPI/Python), two Next.js frontends (public
viewer + console), shared schemas, a design system, and a simulator package. We
need a workspace topology that supports:

- A single source of truth for the canonical DPP JSON Schema, consumed by both
  the Python backend (Pydantic codegen) and the TypeScript frontends (TS
  codegen).
- Shared design tokens + React components across both Next.js apps, with zero
  duplication.
- Independent deploys per surface (the public viewer is the most
  traffic-sensitive; the console is internal).
- Team-of-six development with clean code review boundaries.

## Decision

Single monorepo using **pnpm workspaces** for dependency management and
**Turborepo** for task orchestration and remote caching.

The Python backend lives inside the same monorepo (under `apps/api`) but is
managed by `uv` rather than pnpm; pnpm only handles the Node-side workspaces and
orchestrates Python tasks via `package.json` shims that shell out to `uv run`.

## Why not multi-repo

- Schema drift is the single largest risk in any DPP platform. A monorepo
  removes a class of bugs by construction.
- Shared design system requires a build pipeline that crosses both apps.
  Repeated cross-repo PRs would slow that to a crawl.
- Turborepo's task pipeline + remote cache delivers the same fast feedback loops
  a multi-repo CI matrix would, without the coordination overhead.

## Why not Nx

- Nx is heavier, opinionated about generators, and steeper to onboard.
- Turborepo's task model is simpler and aligns naturally with our pnpm workspace
  layout.
- We can adopt Nx later if the workspace grows past ~25 packages; today's ~6
  packages doesn't warrant it.

## Why pnpm specifically

- Strict dependency resolution catches phantom-dependency bugs that npm and yarn
  classic miss.
- `workspace:*` protocol gives us the right semantics for inter-package deps.
- Faster install + smaller disk footprint matters for CI minutes.

## Consequences

- Every Node-side change runs Turborepo's task graph; CI configures remote cache
  against Vercel Remote Cache or similar in v1.5.
- Python toolchain stays separate from Node — `uv` and `pnpm` coexist cleanly
  via the `package.json` script shim pattern. We accept the two-toolchain
  reality rather than forcing a hybrid.
- Adding a new surface = `pnpm create next-app` into `apps/`, add to
  `pnpm-workspace.yaml`, no other coordination required.
