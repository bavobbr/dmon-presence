FROM node:22-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends poppler-utils python3 make g++ ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm ci
RUN npx playwright install --with-deps chromium
COPY . .

FROM base AS test
CMD ["npm", "test"]

FROM base AS build
RUN npm run build

FROM node:22-bookworm-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends poppler-utils ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /app/build ./build
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
ENV HOST=0.0.0.0 PORT=3000 STATE_DIR=/app/state
EXPOSE 3000
CMD ["node", "build"]
