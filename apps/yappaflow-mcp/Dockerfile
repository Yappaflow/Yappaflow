# Playwright image already has Chromium + all OS deps preinstalled.
# Keep this in sync with the `playwright` version in package.json.
FROM mcr.microsoft.com/playwright:v1.49.0-jammy

WORKDIR /app

# Deps first for better layer caching.
COPY package.json ./
# The monorepo lockfile lives at the repo root, not inside the app.
# Railway deploys this app with Root Directory = apps/yappaflow-mcp,
# so we fall back to `npm install` (writes a fresh lockfile on each build).
RUN npm install --no-audit --no-fund

COPY . .

RUN npm run build

# better-sqlite3 DB goes on a Railway volume mounted at /data.
# Set SQLITE_PATH=/data/dna-cache.db in the Railway env.
ENV NODE_ENV=production \
    HOST=0.0.0.0

EXPOSE 3000

CMD ["npm", "start"]
