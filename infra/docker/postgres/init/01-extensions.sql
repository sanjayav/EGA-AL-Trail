-- ──────────────────────────────────────────────────────────────────────────────
-- DPP Platform — Postgres extensions required at database boot.
-- This script runs once on first container start (empty data dir).
-- ──────────────────────────────────────────────────────────────────────────────

-- UUID generation for surrogate keys
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- pg_trgm for fast text search on UPI / cast number / customer prefixes
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- pgcrypto for hashing audit-log entries
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- citext for case-insensitive identifiers (tenant slugs, GLNs as strings)
CREATE EXTENSION IF NOT EXISTS citext;
