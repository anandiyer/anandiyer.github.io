#!/usr/bin/env bash
#
# Build guard for the generated site. Runs in CI against _site after the Jekyll
# build AND the SPA merge, so it sees exactly what ships — including built
# bundles that no amount of source review would catch.
#
# Run locally the same way:   ./scripts/check-built-site.sh _site
#
# Why this exists
# ---------------
# The site header lives in exactly one place, _includes/header.html. Twice now
# pages have carried hand-copied duplicates of it, so a logo change landed on
# most of the site and silently missed the copies (see labs/aeo, labs/lookalike).
# These two checks make that class of drift fail the build instead of shipping.

set -euo pipefail

ROOT="${1:-_site}"
status=0

if [[ ! -d "$ROOT" ]]; then
  echo "check-built-site: '$ROOT' is not a directory" >&2
  exit 2
fi

# ── 1. Retired assets ────────────────────────────────────────────────────────
# Paths that must no longer be referenced by anything we ship. Add a line here
# whenever an asset is superseded — that is what turns a silent stale reference
# into a build failure. The asset file itself may stay in images/ (external
# hotlinks); this only forbids *our* pages pointing at it.
RETIRED=(
  "logo-rectangle-trans-short.svg"  # superseded by canonical-wordmark-mono.svg
)

# Scan only what a browser actually loads as site UI.
#
# tasks/ is pruned deliberately: it holds planning docs (PRDs, todos) whose
# prose legitimately names retired assets while describing the very migration
# away from them. Jekyll renders those .md files to .html, so a file-extension
# filter alone does not spare them.
WEB_FILES=(--include='*.html' --include='*.js' --include='*.css'
           --include='*.json' --include='*.xml' --include='*.txt' --include='*.svg'
           --exclude-dir='tasks')

for asset in "${RETIRED[@]}"; do
  # --binary-files=without-match keeps grep from choking on fonts/images.
  if hits=$(grep -rn --binary-files=without-match "${WEB_FILES[@]}" --fixed-strings "$asset" "$ROOT" 2>/dev/null); then
    echo "✗ Retired asset '$asset' is still referenced in the built site:" >&2
    echo "$hits" | sed 's/^/    /' >&2
    echo "  → Point these at the current asset. The canonical header lives in _includes/header.html." >&2
    status=1
  fi
done

# ── 2. Un-rendered Liquid ────────────────────────────────────────────────────
# A page that uses {%- raw -%}{% include ... %}{%- endraw -%} only renders it if
# the file has YAML front matter. Drop the front matter and Jekyll copies the
# file verbatim, shipping the tag to the browser as literal text — the page
# looks headerless rather than erroring. Catch that here.
if hits=$(grep -rn --binary-files=without-match --include='*.html' -E '\{%[-]? *include' "$ROOT" 2>/dev/null); then
  echo "✗ Un-rendered Liquid include tag found in the built site:" >&2
  echo "$hits" | sed 's/^/    /' >&2
  echo "  → The source page is missing its YAML front matter (the leading '---' block)." >&2
  status=1
fi

if [[ $status -eq 0 ]]; then
  echo "✓ check-built-site: no retired assets, no un-rendered includes."
fi

exit $status
