FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json tsconfig.json nest-cli.json ./
RUN npm ci

COPY src ./src

RUN npm run build

# ---

FROM node:22-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && \
    npm install ts-node tsconfig-paths

COPY --from=builder /app/dist ./dist
COPY migrations ./migrations
COPY tsconfig.json ./
COPY src/database/data-source.ts ./src/database/data-source.ts
COPY src/entities ./src/entities

ENV NODE_ENV=production
ENV PORT=8080

CMD ["node", "dist/main.js"]
