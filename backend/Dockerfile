# Stage 1: Build TypeScript/NestJS bundle
FROM node:20-bookworm-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

COPY tsconfig.json tsconfig.build.json nest-cli.json .swcrc ./
COPY src ./src

RUN npm run build && npm prune --omit=dev --legacy-peer-deps

# Stage 2: Production runtime with Playwright browser dependencies
FROM mcr.microsoft.com/playwright:v1.65.0-noble AS runtime

WORKDIR /app

ENV NODE_ENV=production \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
    PORT=8000

COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

RUN mkdir -p /app/storage/screenshots /app/storage/traces /app/storage/logs /app/storage/videos \
    && chown -R pwuser:pwuser /app

USER pwuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8000/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/main.js"]
