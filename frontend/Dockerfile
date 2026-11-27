# Build context: thư mục gốc của monorepo (xem docker-compose.yml)
FROM node:22-alpine AS builder
WORKDIR /app

ARG NEXT_PUBLIC_API_URL=http://localhost:8000/api
ARG NEXT_PUBLIC_SOCKET_URL=http://localhost:8000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_SOCKET_URL=$NEXT_PUBLIC_SOCKET_URL \
    NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json* ./
COPY packages/shared/package.json packages/shared/
COPY backend/package.json backend/
COPY frontend/package.json frontend/
COPY admin/package.json admin/

RUN npm install --workspace=@hotel/shared --workspace=hotel-management-frontend

COPY packages/shared packages/shared
COPY frontend frontend

RUN npm run build:shared && npm run build:frontend

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME="0.0.0.0" NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/frontend/public ./frontend/public
COPY --from=builder /app/frontend/.next ./frontend/.next
COPY --from=builder /app/frontend/package.json ./frontend/package.json

WORKDIR /app/frontend
EXPOSE 3000

CMD ["npx", "next", "start", "-p", "3000"]
