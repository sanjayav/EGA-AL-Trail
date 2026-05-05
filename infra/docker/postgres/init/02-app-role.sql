-- ──────────────────────────────────────────────────────────────────────────────
-- Application role.
--
-- POSTGRES_USER (`dpp`) is the bootstrap superuser. Superusers BYPASS row-level
-- security regardless of FORCE / policies — connecting as dpp would silently
-- defeat the multi-tenant isolation the schema declares.
--
-- We therefore create a dedicated NOSUPERUSER NOBYPASSRLS role (`dpp_app`)
-- that the application and tests connect as. Migrations still run as `dpp`
-- (it owns objects), but the runtime/test connections must use `dpp_app`.
-- ──────────────────────────────────────────────────────────────────────────────

CREATE ROLE dpp_app WITH LOGIN PASSWORD 'dpp_local_dev_only' NOSUPERUSER NOBYPASSRLS NOINHERIT;

GRANT CONNECT ON DATABASE dpp TO dpp_app;
GRANT USAGE, CREATE ON SCHEMA public TO dpp_app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO dpp_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO dpp_app;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO dpp_app;

-- Future tables/sequences created by `dpp` (Alembic migrations) automatically
-- grant access to `dpp_app`. Without this, alembic upgrade head would create
-- objects only `dpp` can touch.
ALTER DEFAULT PRIVILEGES FOR ROLE dpp IN SCHEMA public GRANT ALL ON TABLES TO dpp_app;
ALTER DEFAULT PRIVILEGES FOR ROLE dpp IN SCHEMA public GRANT ALL ON SEQUENCES TO dpp_app;
