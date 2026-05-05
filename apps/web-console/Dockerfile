# syntax=docker/dockerfile:1.7
# Multi-stage build for the @dpp/web-console Next.js app.
# Uses pnpm + standalone output so the runtime image is ~150MB.

ARG NODE_VERSION=20.18.0

# ── Builder ────────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-alpine AS builder

ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    NEXT_TELEMETRY_DISABLED=1

RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

WORKDIR /repo

# Copy lockfile + workspace topology first so subsequent edits to source
# don't bust the deps cache.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig.base.json /repo/
COPY apps/web-console/package.json /repo/apps/web-console/
COPY apps/web-public/package.json /repo/apps/web-public/
COPY packages/schema/package.json /repo/packages/schema/
COPY packages/ui/package.json /repo/packages/ui/
COPY packages/viewer-blocks/package.json /repo/packages/viewer-blocks/

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

COPY packages /repo/packages
COPY apps/web-console /repo/apps/web-console

RUN pnpm --filter @dpp/web-console build

# ── Runtime ────────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-alpine AS runtime

ENV NODE_ENV=production \
    PORT=3001 \
    NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache tini \
 && addgroup -S -g 10001 dpp \
 && adduser -S -D -u 10001 -G dpp dpp

WORKDIR /app

# Copy the standalone output produced by Next 15 + output:'standalone'.
COPY --from=builder /repo/apps/web-console/.next/standalone /app
COPY --from=builder /repo/apps/web-console/.next/static /app/apps/web-console/.next/static
COPY --from=builder /repo/apps/web-console/public /app/apps/web-console/public

USER dpp
EXPOSE 3001
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "apps/web-console/server.js"]
