# dpp-api

Backend services for the EGA Aluminium Digital Product Passport platform —
ingestion, generator, signer, resolver, audit. See repo-root `README.md` and
`CLAUDE.md` for the full picture.

## Local dev

```sh
# from repo root
pnpm infra:up                    # postgres + redis + minio + mailhog
uv sync --all-extras              # in apps/api
uv run alembic upgrade head
uv run uvicorn dpp_api.main:app --reload
```
