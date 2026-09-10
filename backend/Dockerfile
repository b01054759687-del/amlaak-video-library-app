# Stage 1: Build & Dependencies
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# Stage 2: Production Minimal Runtime
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
COPY src/ ./src/

USER node
EXPOSE 8080

CMD ["node", "src/server.js"]
