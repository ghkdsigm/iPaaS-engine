FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY src ./src
ENV PORT=4021
EXPOSE 4021
CMD ["node","src/main.js"]
