# Orchestrator - production container

FROM node:20-alpine AS builder
WORKDIR /app

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

# prisma CLI가 devDependency에 있는 구조라면, 런타임에서 omit=dev 하면 npx prisma가 실패합니다.
# 개발/데모 환경에서는 devDeps 포함 설치로 스키마 자동 반영을 우선 보장합니다.
RUN npm ci --silent

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/prisma ./src/prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 3001

# migrations가 없으니 migrate deploy 대신 db push로 테이블을 생성/동기화
CMD ["sh", "-c", "npx prisma db push --schema src/prisma/schema.prisma; node dist/main.js"]
