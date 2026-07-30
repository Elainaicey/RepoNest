# syntax=docker/dockerfile:1

# vinext emits a platform-neutral JavaScript/WASM standalone bundle. Building
# it once on the native runner avoids executing npm install through QEMU while
# the final stage still uses the requested target architecture.
FROM --platform=$BUILDPLATFORM node:24-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:24-alpine AS runner

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

WORKDIR /app

RUN addgroup --system --gid 1001 reponest \
    && adduser --system --uid 1001 --ingroup reponest reponest

COPY --from=builder --chown=reponest:reponest /app/dist/standalone ./

USER reponest

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/ >/dev/null || exit 1

CMD ["node", "server.js"]
