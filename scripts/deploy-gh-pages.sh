#!/usr/bin/env bash
# Manual deploy, for when GitHub Actions can't run: builds the site and pushes it to the
# gh-pages branch, which GitHub Pages serves (Settings → Pages → Source: Deploy from a branch).
# Needs the GitHub CLI logged in as janferfolja. Run with: npm run deploy
set -euo pipefail
cd "$(dirname "$0")/.."

REPO=janferfolja/multe-sokol
export GH_TOKEN="$(gh auth token --user janferfolja)"
var() { gh api "repos/$REPO/actions/variables/$1" --jq .value; }

VITE_SUPABASE_URL="$(var VITE_SUPABASE_URL)" VITE_SUPABASE_ANON_KEY="$(var VITE_SUPABASE_ANON_KEY)" npm run build
touch dist/.nojekyll

rev="$(git rev-parse --short HEAD)"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
cp -r dist/. "$tmp"
cd "$tmp"
git init -q -b gh-pages
git add -A
git -c user.name="Jan Ferfolja" -c user.email="135964164+janferfolja@users.noreply.github.com" commit -q -m "Deploy $rev"
git -c credential.helper= \
  -c credential.helper='!f() { test "$1" = get && echo username=janferfolja && echo "password=$GH_TOKEN"; }; f' \
  push -q -f "https://github.com/$REPO.git" gh-pages
echo "Pushed $rev to gh-pages. Live in about a minute: https://janferfolja.github.io/multe-sokol/"
