#!/usr/bin/env bash
# Yappaflow project cleanup — audited list of files/folders that are safe to delete.
#
# WHAT THIS DELETES (grouped by confidence):
#   1. Build artifacts / caches — regenerated on every build
#   2. Dead deployment config — we're on Vercel + Railway, not Netlify
#   3. OS junk — .DS_Store everywhere
#   4. Unreferenced frontend components — verified with grep across static +
#      dynamic imports; none of these are imported by any page, layout, or
#      other component. They appear to be landing-page variants that were
#      tried and abandoned.
#
# WHAT THIS DOES NOT TOUCH:
#   - app/              — Expo mobile app. Not in turbo workspaces but present
#                         in git; leave for the owner to decide.
#   - sites/creative-agency — demo/reference site; small, leaving alone.
#   - memory/           — AI design protocol docs used as prompt references.
#   - tunnel/           — ngrok workspace; still useful for local webhook dev.
#   - .claude/worktrees — managed by `git worktree`; remove with
#                         `git worktree prune` or `git worktree remove <name>`.
#
# Run from the repo root:
#   bash scripts/cleanup.sh

set -u  # keep going on missing files; just refuse unset vars

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
echo "Working in: $ROOT"
echo

# ── 1. Build artifacts / caches (in .gitignore anyway) ──────────────────────
echo "[1/4] Removing build artifacts…"
rm -rf server/dist shared/dist
rm -rf web/.next
rm -rf .turbo server/.turbo shared/.turbo web/.turbo
rm -f  web/tsconfig.tsbuildinfo
# stale webpack dev cache leftovers
find web/.next/cache -name "*.old" -delete 2>/dev/null || true

# ── 2. Dead deployment config ────────────────────────────────────────────────
echo "[2/4] Removing dead deployment config…"
# We deploy web on Vercel now — this Netlify config is orphaned.
rm -f netlify.toml

# ── 3. OS junk ───────────────────────────────────────────────────────────────
echo "[3/4] Removing .DS_Store everywhere…"
find . -name ".DS_Store" \
  -not -path "*/node_modules/*" \
  -not -path "*/.git/*" \
  -not -path "*/.claude/worktrees/*" \
  -delete

# ── 4. Unreferenced frontend components ──────────────────────────────────────
echo "[4/4] Removing unreferenced frontend components…"
# UI primitives / effects that aren't imported anywhere:
rm -f web/src/components/ui/GradientBackground.tsx
rm -f web/src/components/ui/LoadingScreen.tsx
rm -f web/src/components/ui/ParticleRing.tsx
rm -f web/src/components/ui/shadcn-button.tsx
rm -f web/src/components/ui/WaterCanvas.tsx
rm -f web/src/components/ui/SectionHeading.tsx
rm -f web/src/components/ui/SlidingIconStrip.tsx
rm -f web/src/components/ui/ScrollAnimationProvider.tsx
rm -f web/src/components/ui/GlowOrb.tsx
rm -f web/src/components/ui/ViewportSection.tsx
rm -f web/src/components/ui/MeshGradient.tsx
rm -f web/src/components/ui/Hero115.tsx
rm -f web/src/components/ui/NoiseOverlay.tsx
rm -f web/src/components/ui/LogoBar.tsx

# Page sections that were tried and replaced:
rm -f web/src/components/sections/AboutSection.tsx
rm -f web/src/components/sections/FeatureDetailCards.tsx
rm -f web/src/components/sections/IntegrationGrid.tsx
rm -f web/src/components/sections/ApiSection.tsx
rm -f web/src/components/sections/BuildStorySection.tsx
rm -f web/src/components/sections/ProblemsSection.tsx
rm -f web/src/components/sections/FeatureTabsSection.tsx
rm -f web/src/components/sections/TrustBadgesSection.tsx
rm -f web/src/components/sections/ShipStorySection.tsx
rm -f web/src/components/sections/ListenStorySection.tsx
rm -f web/src/components/sections/DemoVideoSection.tsx
rm -f web/src/components/sections/ScrollTextReveal.tsx
rm -f web/src/components/sections/ShowcaseGrid.tsx
rm -f web/src/components/sections/ShowcaseScrollSection.tsx
rm -f web/src/components/sections/FeaturesSection.tsx
rm -f web/src/components/sections/ShowcaseList.tsx
rm -f web/src/components/sections/WhySection.tsx
rm -f web/src/components/sections/DashboardReveal.tsx
rm -f web/src/components/sections/DashboardStory.tsx

# Three.js scene extras not referenced by the (dynamically-loaded) HeroScene:
rm -f web/src/components/three/RoboticFigure.tsx

# Unused hooks:
rm -f web/src/lib/hooks/useParallax.ts
rm -f web/src/lib/hooks/useFacebookSDK.ts

echo
echo "Done. Recommended verification:"
echo "  npm --prefix web run build     # confirm the frontend still builds"
echo "  npm --prefix server test       # confirm backend tests still pass"
echo "  npm --prefix server run build  # confirm backend compiles"
echo
echo "To prune old git worktrees:"
echo "  git worktree prune"
echo "  # or remove specific ones:"
for w in .claude/worktrees/*/; do
  [ -d "$w" ] && echo "  git worktree remove \"$w\""
done
