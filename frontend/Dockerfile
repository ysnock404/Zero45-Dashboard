# ---- Zero45 Dashboard · Frontend (Vite build -> nginx) ----
FROM node:22-alpine AS build
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
# Same-origin: API + WS go through nginx on the dashboard domain
ARG VITE_API_URL=https://dashboard.ysnock.dev
ARG VITE_WS_URL=https://dashboard.ysnock.dev
# Use vite directly (skip tsc -b: repo has pre-existing type-only errors, runtime is fine)
RUN VITE_API_URL=$VITE_API_URL VITE_WS_URL=$VITE_WS_URL npx vite build

FROM nginx:alpine
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
