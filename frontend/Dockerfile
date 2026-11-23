FROM node:20-alpine

WORKDIR /workspaces/LowCodeAutomationTestingPlatform/frontend

RUN apk add --no-cache libc6-compat git

ENV NODE_ENV=development \
    WATCHPACK_POLLING=true \
    NEXT_TELEMETRY_DISABLED=1

EXPOSE 3000
