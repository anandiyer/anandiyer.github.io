#!/usr/bin/env python3
"""Minimal Jekyll-like renderer for local preview of the canonical.cc pages
touched in this change (homepage #labs section + /labs/ index). Resolves only
the small Liquid subset these pages use: {% include %}, {{ site.asset_version }},
and the header's {% if include.active == 'x' %} guard. Not a full Jekyll."""
import os, re, shutil, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUILD = "/tmp/canonical-preview"
ASSET_VERSION = "20260515"  # mirrors _config.yml asset_version

def load_include(name, active=None):
    with open(os.path.join(ROOT, "_includes", name), encoding="utf-8") as f:
        s = f.read()
    # resolve {% if include.active == 'foo' %}...{% endif %}
    def if_repl(m):
        cond, body = m.group(1), m.group(2)
        want = re.search(r"include\.active\s*==\s*'([^']*)'", cond)
        return body if (want and active == want.group(1)) else ""
    s = re.sub(r"\{%\s*if\s+(include\.active[^%]*?)\s*%\}(.*?)\{%\s*endif\s*%\}",
               if_repl, s, flags=re.S)
    return s

def render(text):
    # {% include name.html active="x" %}
    def inc(m):
        name = m.group(1)
        active = m.group(2)
        return load_include(name, active)
    text = re.sub(r'\{%\s*include\s+([\w.-]+)(?:\s+active="([^"]*)")?\s*%\}', inc, text)
    text = text.replace("{{ site.asset_version }}", ASSET_VERSION)
    # strip Jekyll front matter (--- ... ---) at file top; middle is optional
    # so empty front matter (---\n---) is handled too
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

def link(rel):
    src = os.path.join(ROOT, rel)
    dst = os.path.join(BUILD, rel)
    if not os.path.exists(src):
        return
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    if os.path.lexists(dst):
        os.remove(dst) if os.path.islink(dst) else shutil.rmtree(dst)
    os.symlink(src, dst)
    print("linked", rel)

if os.path.exists(BUILD):
    shutil.rmtree(BUILD)
os.makedirs(BUILD)

render_file("index.html")
render_file("labs/index.html")
render_file("portfolio.html")
for d in ("css", "js", "images", "favicon.ico"):
    link(d)
# link lab project subdirs so clicking through from /labs/ works (raw, not rendered)
for d in ("dilutionlab", "fundmodeler", "power-law", "semiconductor-silicon-stack", "lookalike"):
    link(os.path.join("labs", d))
link("physical-ai-robotics")
print("\nBuild ready at", BUILD)
