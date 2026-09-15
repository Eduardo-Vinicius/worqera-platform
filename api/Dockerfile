# Worqera API — produção (Oracle / VM).
# Build: docker compose -f docker-compose.prod.yml build

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    PORT=80

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
COPY handler.js ./

RUN mkdir -p /app/storage

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:80/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "src/server.js"]
