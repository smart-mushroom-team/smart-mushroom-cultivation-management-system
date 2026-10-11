# Build context là THƯ MỤC GỐC của repo (xem docker-compose.yml): cần cả libs/shared.
FROM node:22-bookworm-slim

# Prisma cần openssl
RUN apt-get update -y \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 1) Chỉ copy các package.json trước để tận dụng cache layer khi cài dependency
COPY package.json package-lock.json ./
COPY libs/shared/package.json libs/shared/
COPY gateway/package.json gateway/
COPY services/identity/package.json services/identity/
COPY services/core/package.json services/core/
COPY services/monitoring/package.json services/monitoring/
RUN npm ci --workspace=services/monitoring

# 2) Copy mã nguồn, sinh Prisma Client
COPY libs/shared libs/shared
COPY services/monitoring services/monitoring
RUN npx prisma generate --schema services/monitoring/prisma/schema.prisma

WORKDIR /app/services/monitoring
EXPOSE 3003

# Áp dụng migration rồi chạy service (chưa có migration nào thì bước đầu không làm gì)
CMD ["sh", "-c", "npx prisma migrate deploy && node src/index.js"]
