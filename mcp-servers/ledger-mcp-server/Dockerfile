FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY src ./src
ENV PORT=4031
EXPOSE 4031
CMD ["node","src/main.js"]
