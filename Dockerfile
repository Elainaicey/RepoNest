# syntax=docker/dockerfile:1

FROM node:24-alpine AS web-builder

WORKDIR /build/web
COPY package.json package-lock.json ./
RUN npm ci
COPY app ./app
COPY components ./components
COPY lib ./lib
COPY public ./public
COPY next.config.ts postcss.config.mjs tsconfig.json vite.config.ts ./
RUN npm run build

FROM node:24-alpine AS api-dependencies

WORKDIR /build/api
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev

FROM node:24-alpine AS api-builder

WORKDIR /build/api
COPY server/package.json server/package-lock.json ./
RUN npm ci
COPY server/tsconfig.json ./
COPY server/src ./src
COPY server/migrations ./migrations
RUN npm run build

FROM node:24-alpine AS runner

ENV NODE_ENV=production \
    PORT=3000 \
    DATABASE_PATH=/data/database

RUN apk add --no-cache su-exec tini \
    && addgroup --system --gid 1001 reponest \
    && adduser --system --uid 1001 --ingroup reponest reponest

WORKDIR /app

COPY --from=web-builder --chown=reponest:reponest /build/web/dist/standalone ./web
COPY --from=api-dependencies --chown=reponest:reponest /build/api/node_modules ./api/node_modules
COPY --from=api-builder --chown=reponest:reponest /build/api/dist ./api/dist
COPY --from=api-builder --chown=reponest:reponest /build/api/migrations ./api/migrations
COPY --from=api-builder --chown=reponest:reponest /build/api/package.json ./api/package.json
COPY --chown=reponest:reponest deploy/supervisor.mjs ./runtime/supervisor.mjs
COPY deploy/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

RUN chmod 0755 /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=5 \
  CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null || exit 1

ENTRYPOINT ["/sbin/tini", "--", "/usr/local/bin/docker-entrypoint.sh"]
