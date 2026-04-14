# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=24-alpine

# -----------------------------------------------------------------------------
# Base Node image
# -----------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS base
WORKDIR /app

# -----------------------------------------------------------------------------
# Dependencies
# -----------------------------------------------------------------------------
FROM base AS deps
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --legacy-peer-deps

# -----------------------------------------------------------------------------
# Source
# -----------------------------------------------------------------------------
FROM deps AS source
COPY . .

# -----------------------------------------------------------------------------
# Production build
# -----------------------------------------------------------------------------
FROM source AS build
ENV NODE_ENV=production
RUN npm run build

# -----------------------------------------------------------------------------
# Production runtime image
# -----------------------------------------------------------------------------
FROM nginx:1.27-alpine AS prod
WORKDIR /usr/share/nginx/html
COPY docker/config/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist ./

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD wget -q -O- http://127.0.0.1/ >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]

# -----------------------------------------------------------------------------
# Developer image
# -----------------------------------------------------------------------------
FROM source AS dev
ENV NODE_ENV=development

EXPOSE 5173
CMD ["sh", "-c", "npm run dev -- --host --port 5173"]
