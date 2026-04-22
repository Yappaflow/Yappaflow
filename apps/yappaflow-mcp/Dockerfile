# Keep this tag in sync with the resolved `playwright` version in the monorepo
# package-lock.json (currently 1.59.1). Mismatch → npm downloads a newer
# Chromium revision while the image carries OS libs for an older one, and
# launch fails with "libglib-2.0.so.0: cannot open shared object file".
#
# To bump: check `grep -A1 '"node_modules/playwright"' package-lock.json`
# at the repo root and update both sides.
FROM mcr.microsoft.com/playwright:v1.59.1-jammy

WORKDIR /app

# Deps first for better layer caching. The monorepo lockfile lives at the
# repo root, so with Railway Root Directory = apps/yappaflow-mcp there is
# no package-lock.json available here — use `npm install` rather than `npm ci`.
COPY package.json ./
RUN npm install --no-audit --no-fund

# Safety net: if playwright resolves to a revision the base image wasn't
# pre-seeded with, pull the matching browser + OS deps now. `--with-deps`
# needs root, which the Dockerfile build step runs as. Cheap when it's a
# no-op, rescues the build when the image and lockfile drift.
RUN npx playwright install --with-deps chromium

COPY . .

RUN npm run build

# better-sqlite3 DB goes on a Railway volume mounted at /data.
# Set SQLITE_PATH=/data/dna-cache.db in the Railway env.
ENV NODE_ENV=production \
    HOST=0.0.0.0

EXPOSE 3000

CMD ["npm", "start"]
