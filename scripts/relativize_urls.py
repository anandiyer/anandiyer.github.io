#!/usr/bin/env python3
"""One-shot helper: convert internal canonical.cc absolute URLs to root-relative.

  https://canonical.cc/foo         → /foo
  https://www.canonical.cc/foo     → /foo

Skips:
  - <link rel="canonical">                (SEO requires absolute)
  - og:url / og:image / twitter:url / twitter:image meta tags (sharing)
  - subdomains (blog.canonical.cc, fundmodeler.canonical.cc) — different origin

Run from repo root:
    python3 scripts/relativize_urls.py [--check]
"""
import os, re, sys, glob

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHECK_ONLY = "--check" in sys.argv

# Lines containing any of these get skipped entirely.
SAFE_LINE_PATTERNS = [
    r'rel="canonical"',
    r'(?:property|name)="og:url"',
    r'(?:property|name)="og:image"',
    r'(?:property|name)="og:secure_url"',
    r'(?:property|name)="twitter:url"',
    r'(?:property|name)="twitter:image"',
    r'(?:property|name)="twitter:src"',
]
SAFE = re.compile("|".join(SAFE_LINE_PATTERNS))

# Match https://canonical.cc or https://www.canonical.cc, but NOT subdomains
# (because `(?:www\.)?` allows only "www." or nothing as the prefix). Also
# consumes the trailing slash (if any) so bare-domain hrefs collapse to "/"
# rather than the empty string.
ABS_URL = re.compile(r'https?://(?:www\.)?canonical\.cc(?:/|(?=["\']))')

# Directories to skip entirely.
SKIP_DIRS = {
    "node_modules",
    ".git",
    "labs/fundmodeler/node_modules",
    "labs/fundmodeler/dist",
    "labs/capital-call-planner/assets",  # built artefacts; don't rewrite
}


def should_skip_path(rel):
    parts = rel.split(os.sep)
    for d in SKIP_DIRS:
        if d in rel:
            return True
    return False


def transform_file(path):
    with open(path, encoding="utf-8") as f:
        original = f.read()
    lines = original.splitlines(keepends=True)
    out = []
    for line in lines:
        if SAFE.search(line):
            out.append(line)
            continue
        out.append(ABS_URL.sub("", line))
    new = "".join(out)
    if new == original:
        return 0
    if not CHECK_ONLY:
        with open(path, "w", encoding="utf-8") as f:
            f.write(new)
    return new.count("\n") and sum(
        1 for a, b in zip(lines, out) if a != b
    )


def walk():
    files = []
    for ext in ("html", "js", "css"):
        files += glob.glob(os.path.join(REPO_ROOT, f"**/*.{ext}"), recursive=True)
    return files


total = 0
for path in walk():
    rel = os.path.relpath(path, REPO_ROOT)
    if should_skip_path(rel):
        continue
    n = transform_file(path)
    if n:
        total += n
        print(f"{'would update' if CHECK_ONLY else 'updated'} ({n} line{'s' if n != 1 else ''}): {rel}")

print(f"\n{'Would change' if CHECK_ONLY else 'Changed'} {total} lines total.")
