import { useEffect, useRef } from "react";

/**
 * Loads the shared canonical.cc footer from /partials/footer.html.
 * Falls back to a minimal inline footer in dev.
 */
export function Footer() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/partials/footer.html")
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.text();
      })
      .then((html) => {
        if (!ref.current || !html) return;
        ref.current.innerHTML = html;
        ref.current.querySelectorAll("script").forEach((old) => {
          const s = document.createElement("script");
          if (old.src) s.src = old.src;
          else s.textContent = old.textContent;
          old.replaceWith(s);
        });
      })
      .catch(() => {
        if (!ref.current) return;
        ref.current.innerHTML = `
          <footer style="padding:3rem 0;border-top:1px solid rgba(255,255,255,0.1);">
            <div style="max-width:1280px;margin:0 auto;padding:0 2rem;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;">
              <p style="color:rgba(255,255,255,0.7);font-size:0.875rem;margin:0;">&copy; 2025 Canonical. All rights reserved.</p>
              <div style="display:flex;align-items:center;gap:1.5rem;">
                <a href="https://x.com/canonicalcc" target="_blank" rel="noopener noreferrer" style="color:rgba(255,255,255,0.7);font-size:0.875rem;text-decoration:none;">Canonical on X</a>
                <a href="https://blog.canonical.cc" target="_blank" rel="noopener noreferrer" style="color:rgba(255,255,255,0.7);font-size:0.875rem;text-decoration:none;">Canonical on Substack</a>
              </div>
            </div>
          </footer>
        `;
      });
  }, []);

  return <div ref={ref} />;
}
