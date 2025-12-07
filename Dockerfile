# Dockerfile

FROM oven/bun:latest AS builder

WORKDIR /app
COPY package*.json ./
RUN bun install

COPY . .

FROM oven/bun:latest

WORKDIR /app

COPY --from=builder /usr/local/bin/bun /usr/local/bin/bun
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/bun.lockb ./

COPY --from=builder /app/src ./src
COPY --from=builder /app/drizzle.config.js ./drizzle.config.js

EXPOSE 3000

CMD [ "bun", "run", "start" ] # <-- GANTI DARI NPM RUN START