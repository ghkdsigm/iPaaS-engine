# Orchestrator - production container

FROM node:20-alpine AS builder
WORKDIR /app

# Prisma on Alpine needs OpenSSL
RUN apk add --no-cache openssl

COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY tsconfig.json nest-cli.json ./
COPY src ./src

# Generate Prisma client and build NestJS
RUN npx prisma generate --schema src/prisma/schema.prisma
RUN npm run build


FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache openssl

ENV NODE_ENV=production
ENV PORT=3001

COPY --from=builder /app/package.json /app/package-lock.json* ./
RUN npm ci --silent --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/prisma ./src/prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 3001

CMD ["sh", "-c", "npx prisma migrate deploy --schema src/prisma/schema.prisma || true; node dist/main.js"]
