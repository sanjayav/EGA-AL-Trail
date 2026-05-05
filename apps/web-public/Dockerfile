# syntax=docker/dockerfile:1.7
# Multi-stage build for the public DPP viewer.

ARG NODE_VERSION=20.18.0

FROM node:${NODE_VERSION}-alpine AS builder

ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    NEXT_TELEMETRY_DISABLED=1

RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

WORKDIR /repo

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig.base.json /repo/
COPY apps/web-public/package.json /repo/apps/web-public/
COPY apps/web-console/package.json /repo/apps/web-console/
COPY packages/schema/package.json /repo/packages/schema/
COPY packages/ui/package.json /repo/packages/ui/
COPY packages/viewer-blocks/package.json /repo/packages/viewer-blocks/

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

COPY packages /repo/packages
COPY apps/web-public /repo/apps/web-public

RUN pnpm --filter @dpp/web-public build

# ── Runtime ────────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-alpine AS runtime

ENV NODE_ENV=production \
    PORT=3000 \
    NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache tini \
 && addgroup -S -g 10001 dpp \
 && adduser -S -D -u 10001 -G dpp dpp

WORKDIR /app

COPY --from=builder /repo/apps/web-public/.next/standalone /app
COPY --from=builder /repo/apps/web-public/.next/static /app/apps/web-public/.next/static
COPY --from=builder /repo/apps/web-public/public /app/apps/web-public/public

USER dpp
EXPOSE 3000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "apps/web-public/server.js"]
