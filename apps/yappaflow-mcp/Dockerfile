# Keep this tag in sync with the resolved `playwright` version in the monorepo
# package-lock.json (currently 1.59.1). Mismatch → npm downloads a newer
# Chromium revision while the image carries OS libs for an older one, and
# launch fails with "libglib-2.0.so.0: cannot open shared object file".
#
# To bump: check `grep -A1 '"node_modules/playwright"' package-lock.json`
# at the repo root and update both sides.
#
# Build context = apps/yappaflow-mcp/ (scoped by Railway because the
# Config-as-code file lives inside this folder). All COPY paths below are
# therefore relative to THIS directory, not the repo root.
FROM mcr.microsoft.com/playwright:v1.59.1-jammy

WORKDIR /app

# better-sqlite3 is native code. If prebuild-install can't fetch a
# matching binary for this Node/arch, npm falls back to compiling from
# source — which needs python3 + a C++ toolchain. The Playwright image
# ships a lot, but not always build-essential, so install defensively.
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy just package.json so deps install from the manifest and cache well.
COPY package.json ./package.json

RUN npm install --no-audit --no-fund

# Safety net: if playwright resolves to a revision the base image wasn't
# pre-seeded with, pull the matching browser + OS deps now. `--with-deps`
# needs root, which the Dockerfile build step runs as. Cheap when it's a
# no-op, rescues the build when the image and lockfile drift.
RUN npx playwright install --with-deps chromium

# Now copy the rest of the MCP app source.
COPY . ./

RUN npm run build

# better-sqlite3 DB goes on a Railway volume mounted at /data.
# Set SQLITE_PATH=/data/dna-cache.db in the Railway env.
ENV NODE_ENV=production \
    HOST=0.0.0.0

EXPOSE 3000

CMD ["npm", "start"]

# rebuild 3
