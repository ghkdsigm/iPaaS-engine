FROM node:20-alpine
WORKDIR /app

COPY package.json ./
RUN npm install --silent

COPY src ./src

ENV NODE_ENV=production
ENV PORT=4001
EXPOSE 4001

CMD ["node", "src/main.js"]
