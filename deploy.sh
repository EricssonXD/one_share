#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# OnePlay — Deploy Script
# Usage: ./deploy.sh
#
# Builds the frontend and deploys everything as a single Cloudflare Worker.
# Run from the oneplay/ root directory.
# ─────────────────────────────────────────────────────────────────────────────

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
WORKER_DIR="$SCRIPT_DIR/worker"

echo ""
echo "⛅  OnePlay Deploy"
echo "──────────────────"

# ── Step 1: Build the frontend ────────────────────────────────────────────────
echo ""
echo "▶  Building frontend..."
cd "$FRONTEND_DIR"
bun install --frozen-lockfile
bun run build

echo "✓  Frontend built → frontend/dist/"

# ── Step 2: Deploy the Worker (includes frontend assets) ─────────────────────
echo ""
echo "▶  Deploying Worker + frontend assets..."
cd "$WORKER_DIR"
wrangler deploy

echo ""
echo "✨  Deploy complete!"
echo ""
