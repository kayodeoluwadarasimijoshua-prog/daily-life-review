# --- Daily Life Review — production image ---
FROM node:20-slim AS base
WORKDIR /app

# better-sqlite3 needs build tooling if no prebuilt binary matches.
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# --- deps ---
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

# --- build ---
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# --- run ---
ENV NODE_ENV=production
ENV PORT=3000
# Persist the SQLite DB on a mounted volume (see DATA_DIR).
ENV DATA_DIR=/var/data
RUN mkdir -p /var/data

EXPOSE 3000
CMD ["npm", "start", "--", "-p", "3000"]
