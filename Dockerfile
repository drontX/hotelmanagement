# Build context: thư mục gốc của monorepo (xem docker-compose.yml)
FROM node:20-alpine AS build
WORKDIR /app

# VITE_* được nhúng vào bundle lúc build
ARG VITE_API_URL=http://localhost:8000/api
# Đường dẫn gốc của trang admin (khớp với location /admin/ trong nginx)
ARG ADMIN_BASE=/admin/
ENV VITE_API_URL=$VITE_API_URL

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY backend/package.json backend/
COPY frontend/package.json frontend/
COPY admin/package.json admin/

RUN npm ci --workspace=@hotel/shared --workspace=hotel-management-admin

COPY packages/shared packages/shared
COPY admin admin

# --base được truyền tiếp tới lệnh "vite build" trong script build của admin
RUN npm run build:shared \
 && npm --workspace=hotel-management-admin run build -- --base=${ADMIN_BASE}

# Phục vụ file tĩnh bằng nginx trên cổng 3001, dưới đường dẫn /admin/
FROM nginx:alpine
COPY admin/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/admin/dist /usr/share/nginx/html/admin
EXPOSE 3001
