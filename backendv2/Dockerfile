FROM node:22.12-alpine3.20

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY src ./src
COPY migrations ./migrations
COPY scripts ./scripts

RUN mkdir -p uploads && chown -R node:node /app

USER node

EXPOSE 4000
CMD ["sh", "-c", "node scripts/migrate.js && node src/index.js"]
