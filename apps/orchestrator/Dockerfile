FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --silent
COPY tsconfig.json nest-cli.json ./
COPY src ./src
RUN npx prisma generate --schema src/prisma/schema.prisma
ENV NODE_ENV=production
ENV PORT=3001
CMD ["sh", "-c", "npx prisma migrate deploy --schema src/prisma/schema.prisma || true; npm run start:dev"]
