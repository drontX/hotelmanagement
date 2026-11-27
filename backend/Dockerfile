# Build context: thư mục gốc của monorepo (xem docker-compose.yml)
FROM node:22-alpine AS builder
WORKDIR /app

# Prisma cần OpenSSL trên Alpine
RUN apk add --no-cache openssl

COPY package.json package-lock.json* ./
COPY packages/shared/package.json packages/shared/
COPY backend/package.json backend/
COPY frontend/package.json frontend/
COPY admin/package.json admin/

RUN npm install --workspace=@hotel/shared --workspace=hotel-management-backend

COPY packages/shared packages/shared
COPY backend backend

RUN npm run build:shared \
 && npx --workspace=hotel-management-backend prisma generate \
 && npm run build:backend

FROM node:22-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl

ENV NODE_ENV=production
ENV BACKEND_PORT=8000

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/backend/package.json ./backend/package.json
COPY --from=builder /app/backend/prisma ./backend/prisma
COPY --from=builder /app/backend/dist ./backend/dist

WORKDIR /app/backend
EXPOSE 8000

CMD ["node", "dist/index.js"]
