# Lessons

Patterns worth not repeating. Each entry: what went wrong, and the rule that prevents it.

## Never infer which site a request is about

**2026-08-16.** A Cloudflare agent-readiness report was pasted with no domain named. I inferred
**anandiyer.com** from the most recently modified files and the newest fix-plan in `~/Downloads`,
explored the wrong repo, and got most of the way to a plan before being asked "i want to make
sure this is for canonical.cc — is that your understanding?"

This has now happened in *both* directions — an earlier session had to be corrected the
opposite way. The two sites get near-identical AEO and agent-readiness work, so a pasted
report, scan, or fix-plan reads as perfectly plausible for either one.

**Rule:** when a request arrives without naming its domain, *ask before doing anything*.
Recency of files is not evidence — it is precisely the signal that misled. Once named, confirm
against `CNAME` and the live `server:` header before editing.

Related: the two sites also differ in ways that change what is even possible. Both sit on
Cloudflare nameservers, but only canonical.cc is **proxied**; anandiyer.com is DNS-only and
resolves straight to GitHub Pages. Edge features — Markdown for Agents, Transform Rules,
Snippets, Worker routes — exist on one and are unavailable on the other. Check for a `cf-ray`
header before proposing any edge fix.

## A dashboard rule that "deployed successfully" can still be silently inert

**2026-08-16.** Two Cloudflare response-header transform rules deployed cleanly from the
dashboard and had no effect. Reading the ruleset back over the API showed the expressions had
been stored as literal wildcard URL patterns:

```
(http.request.full_uri wildcard r#"(http.host in {"canonical.cc" ...} and ...)"#)
```

The match section was in wildcard-pattern mode rather than the raw expression editor, so the
expression text was being string-matched against URLs. Nothing matches the characters
`(http.host in {`. The dashboard's "your DNS may not be proxying traffic for
`(http.request.uri.path eq "`" warning was the same mis-parse showing through — it read the
expression as a hostname and truncated it at the first `/`.

**Rule:** verify config changes by their observable effect, never by the UI reporting success.
When a rule does nothing, read it back over the API before theorising — the stored form is the
ground truth and it took one call to see the bug. In the dashboard, switch the match section to
**Custom filter expression → Edit expression** before pasting any expression.

**Corollary:** propagation is not uniform. After the fix, `Content-Type` took effect in seconds
while `Link` took about a minute — same ruleset, same deploy. One early curl returning nothing
is not evidence of failure; it nearly sent this down a wrong diagnostic path.
