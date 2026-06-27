#!/usr/bin/env python3
"""Minimal Jekyll-like renderer for local preview of canonical.cc pages.
Resolves the small Liquid subset the static pages use:
  {% include name.html [active="x"] %}
  {{ site.asset_version }}
  {% if include.active == 'x' %}...{% endif %}
Not a full Jekyll — just enough for local UI preview.

Usage:
    python3 scripts/preview_render.py
    python3 -m http.server -d /tmp/canonical-preview 4000
"""
import os, re, shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUILD = "/tmp/canonical-preview"
ASSET_VERSION = "20260525a"  # mirrors _config.yml asset_version

# Files to template-render. Everything else is symlinked.
RENDERED = [
    "index.html",
    "portfolio.html",
    "labs/index.html",
    "labs/dilutionlab/index.html",
    "labs/physical-ai/index.html",
    "labs/power-law/index.html",
    "labs/semiconductor-silicon-stack/index.html",
    "labs/data-centers/index.html",
    "labs/decentralized-ai/index.html",
    "labs/physical-ai-robotics/index.html",
    "physical-ai-robotics/index.html",
    # partials/* are Jekyll passthroughs the SPA (fundmodeler) fetches at
    # runtime to render the shared header/footer. Must be templated, not raw.
    "partials/header.html",
    "partials/footer.html",
]

# Top-level asset dirs/files to symlink wholesale (no rendered children).
LINKED_ROOT = [
    "css",
    "js",
    "images",
    "favicon.ico",
    "favicon_io",
    "fonts",
    "_includes",
]

# Lab subdirs that contain a rendered index.html — link each sibling file
# individually so the rendered file isn't clobbered.
SHALLOW_LINK_LAB_DIRS = [
    "labs/dilutionlab",
    "labs/power-law",
    "labs/semiconductor-silicon-stack",
    "labs/data-centers",
    "labs/decentralized-ai",
    "labs/physical-ai-robotics",
    "physical-ai-robotics",
]

# Lab dirs that work as-is (no Jekyll tags inside index.html) — symlink whole.
WHOLE_LINK_LAB_DIRS = [
    "labs/lookalike",
    "labs/capital-call-planner",
]

# Built SPAs whose `dist/` should be served at the lab's URL. Run their build
# step before invoking this script (the GitHub Actions workflow does this).
SPA_DIST_DIRS = [
    ("labs/fundmodeler/dist", "labs/fundmodeler"),
]


def load_include(name, params):
    """Load an include and resolve {% if include.foo == 'x' %} guards plus
    {{ include.foo }} substitutions against the params dict."""
    with open(os.path.join(ROOT, "_includes", name), encoding="utf-8") as f:
        s = f.read()

    # Strip {%- ... -%} whitespace markers around the {% comment %} block etc.
    # Resolve {% if include.X == 'v' %}…{% endif %}
    def if_repl(m):
        cond, body = m.group(1), m.group(2)
        want = re.search(r"include\.(\w+)\s*==\s*'([^']*)'", cond)
        if not want:
            return ""
        key, val = want.group(1), want.group(2)
        return body if params.get(key) == val else ""

    s = re.sub(
        r"\{%-?\s*if\s+(include\.\w+[^%]*?)\s*-?%\}(.*?)\{%-?\s*endif\s*-?%\}",
        if_repl,
        s,
        flags=re.S,
    )
    # Strip {% comment %}...{% endcomment %} blocks
    s = re.sub(
        r"\{%-?\s*comment\s*-?%\}.*?\{%-?\s*endcomment\s*-?%\}",
        "",
        s,
        flags=re.S,
    )
    # Substitute {{ include.X }} (with optional - whitespace markers)
    def var_repl(m):
        return params.get(m.group(1), "")

    s = re.sub(r"\{\{-?\s*include\.(\w+)\s*-?\}\}", var_repl, s)
    return s


def parse_include_params(s):
    """Parse `key="value" key2="value2"` into a dict."""
    return dict(re.findall(r'(\w+)="([^"]*)"', s or ""))


def render(text):
    def inc(m):
        name = m.group(1)
        params = parse_include_params(m.group(2) or "")
        return load_include(name, params)

    text = re.sub(
        r'\{%-?\s*include\s+([\w.-]+)((?:\s+\w+="[^"]*")*)\s*-?%\}',
        inc,
        text,
    )
    text = text.replace("{{ site.asset_version }}", ASSET_VERSION)
    # strip Jekyll front matter (--- ... ---) at file top
    text = re.sub(r"\A---\s*\n(.*?\n)?---\s*\n", "", text, flags=re.S)
    return text


def render_file(rel):
    src = os.path.join(ROOT, rel)
    dst = os.path.join(BUILD, rel)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    with open(src, encoding="utf-8") as f:
        out = render(f.read())
    with open(dst, "w", encoding="utf-8") as f:
        f.write(out)
    print("rendered", rel)


def symlink(src, dst):
    if os.path.lexists(dst):
        if os.path.islink(dst) or os.path.isfile(dst):
            os.remove(dst)
        else:
            shutil.rmtree(dst)
    os.symlink(src, dst)


def link_root(rel):
    src = os.path.join(ROOT, rel)
    dst = os.path.join(BUILD, rel)
    if not os.path.exists(src):
        return
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    symlink(src, dst)
    print("linked", rel)


def link_dir_shallow(rel_dir):
    """Symlink each child of rel_dir individually, skipping any path that
    already exists in BUILD (i.e. a rendered file)."""
    src_dir = os.path.join(ROOT, rel_dir)
    dst_dir = os.path.join(BUILD, rel_dir)
    os.makedirs(dst_dir, exist_ok=True)
    for entry in os.listdir(src_dir):
        if entry.startswith("."):
            continue
        src = os.path.join(src_dir, entry)
        dst = os.path.join(dst_dir, entry)
        if os.path.lexists(dst):
            continue  # rendered index.html stays
        os.symlink(src, dst)
    print("shallow-linked", rel_dir)


if os.path.exists(BUILD):
    shutil.rmtree(BUILD)
os.makedirs(BUILD)

# 1. Render templated files first so their parent dirs exist as real dirs.
for f in RENDERED:
    render_file(f)

# 2. Link top-level asset dirs and files.
for r in LINKED_ROOT:
    link_root(r)

# 3. Shallow-link lab subdirs whose index.html is rendered.
for d in SHALLOW_LINK_LAB_DIRS:
    link_dir_shallow(d)

# 4. Symlink lab dirs that don't need rendering.
for d in WHOLE_LINK_LAB_DIRS:
    link_root(d)

# 5. Symlink SPA dist dirs to their lab URL (so `localhost:4000/labs/fundmodeler/`
#    serves the built SPA instead of 404'ing).
for src_rel, dst_rel in SPA_DIST_DIRS:
    src = os.path.join(ROOT, src_rel)
    if not os.path.exists(src):
        print(
            f"skipped (no build): {dst_rel}  — run `npm run build` in {src_rel.rsplit('/', 1)[0]}"
        )
        continue
    dst = os.path.join(BUILD, dst_rel)
    if os.path.lexists(dst):
        if os.path.islink(dst) or os.path.isfile(dst):
            os.remove(dst)
        else:
            shutil.rmtree(dst)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    os.symlink(src, dst)
    print(f"linked SPA dist: {dst_rel} → {src_rel}")

print("\nBuild ready at", BUILD)
print("Serve with:  python3 -m http.server -d", BUILD, "4000")
