FROM node:22-alpine AS build
WORKDIR /app

ARG VITE_API_URL=http://localhost:8000/api
ARG ADMIN_BASE=/admin/
ENV VITE_API_URL=$VITE_API_URL

COPY package.json package-lock.json* ./
COPY packages/shared/package.json packages/shared/
COPY backend/package.json backend/
COPY frontend/package.json frontend/
COPY admin/package.json admin/

RUN npm install --workspace=@hotel/shared --workspace=hotel-management-admin

COPY packages/shared packages/shared
COPY admin admin

RUN npm run build:shared \
 && npm --workspace=hotel-management-admin run build -- --base=${ADMIN_BASE}

FROM nginx:alpine
COPY admin/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/admin/dist /usr/share/nginx/html/admin
EXPOSE 3001
CMD ["nginx", "-g", "daemon off;"]
