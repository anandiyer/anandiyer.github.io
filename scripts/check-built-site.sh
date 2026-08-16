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

# ── 3. Agent-skill digests ───────────────────────────────────────────────────
# /.well-known/agent-skills/index.json pins a SHA-256 of every SKILL.md it
# advertises. Nothing on the site reads those digests, so an edited skill with a
# stale digest looks completely fine here and fails only in an agent that
# bothers to verify — the worst kind of bug, silent and remote. Recompute them
# against what actually shipped.
#
# This also catches the subtler failure: Jekyll converting a SKILL.md into HTML
# instead of copying it. The skills carry no YAML front matter precisely so they
# stay static files, and if that ever stops being true the file goes missing
# from its published path and this check says so.
SKILLS_INDEX="$ROOT/.well-known/agent-skills/index.json"

if [[ ! -f "$SKILLS_INDEX" ]]; then
  # Not "nothing to check" — the whole agent-discovery surface failed to ship.
  # Jekyll skips dot-directories unless _config.yml names .well-known under
  # 'include', and dropping that line breaks /.well-known/api-catalog and the
  # skills index at once, silently.
  echo "✗ $SKILLS_INDEX is missing from the built site." >&2
  echo "  → _config.yml must list '.well-known' under 'include' or Jekyll skips it." >&2
  status=1
elif ! python3 -c "import json,sys; json.load(open(sys.argv[1]))" "$SKILLS_INDEX" 2>/dev/null; then
  echo "✗ $SKILLS_INDEX is not valid JSON." >&2
  status=1
else
  while IFS=$'\t' read -r url want; do
    artifact="$ROOT${url}"

    if [[ ! -f "$artifact" ]]; then
      echo "✗ Agent skill '$url' is advertised in index.json but absent from the built site." >&2
      echo "  → Check _config.yml still lists .well-known under 'include', and that the" >&2
      echo "    SKILL.md has no YAML front matter (front matter makes Jekyll render it to HTML)." >&2
      status=1
      continue
    fi

    got="sha256:$(shasum -a 256 "$artifact" | cut -d' ' -f1)"
    if [[ "$got" != "$want" ]]; then
      echo "✗ Agent skill digest mismatch for '$url':" >&2
      echo "    index.json says $want" >&2
      echo "    file hashes to  $got" >&2
      echo "  → Update the digest in .well-known/agent-skills/index.json:" >&2
      echo "    shasum -a 256 .well-known${url#/.well-known}" >&2
      status=1
    fi
  done < <(python3 -c "
import json, sys
for skill in json.load(open(sys.argv[1]))['skills']:
    print(skill['url'], skill['digest'], sep='\t')
" "$SKILLS_INDEX")
fi

if [[ $status -eq 0 ]]; then
  echo "✓ check-built-site: no retired assets, no un-rendered includes, skill digests match."
fi

exit $status
