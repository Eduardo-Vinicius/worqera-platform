# syntax=docker/dockerfile:1
# Worqera Web — produção (Oracle / VM). Porta 80 (nginx → worqera-web:80).

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN mkdir -p public

ARG NEXT_PUBLIC_API_URL=https://api.seudominio.com
ARG NEXT_PUBLIC_APP_NAME=Worqera
ARG NEXT_PUBLIC_MAX_PHOTOS=8
ARG NEXT_PUBLIC_PLATFORM_ADMIN_EMAILS=

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME \
    NEXT_PUBLIC_MAX_PHOTOS=$NEXT_PUBLIC_MAX_PHOTOS \
    NEXT_PUBLIC_PLATFORM_ADMIN_EMAILS=$NEXT_PUBLIC_PLATFORM_ADMIN_EMAILS \
    NEXT_TELEMETRY_DISABLED=1

RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=80 \
    HOSTNAME=0.0.0.0

RUN mkdir -p public
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 80
CMD ["node", "server.js"]
