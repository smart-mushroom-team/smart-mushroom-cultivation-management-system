# Build context là THƯ MỤC GỐC của repo (xem docker-compose.yml): cần cả libs/shared.
FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
COPY libs/shared/package.json libs/shared/
COPY gateway/package.json gateway/
COPY services/identity/package.json services/identity/
COPY services/core/package.json services/core/
COPY services/monitoring/package.json services/monitoring/
RUN npm ci --workspace=gateway --omit=dev

COPY libs/shared libs/shared
COPY gateway gateway

WORKDIR /app/gateway
EXPOSE 8080
CMD ["node", "src/index.js"]
