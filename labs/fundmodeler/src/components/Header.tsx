import { useEffect, useRef } from "react";

/**
 * Loads the shared canonical.cc header from /partials/header.html.
 * In production (Jekyll build), this partial is available on the same origin.
 * In dev, Vite proxies or falls back gracefully.
 */
export function Header() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/partials/header.html")
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.text();
      })
      .then((html) => {
        if (!ref.current || !html) return;
        ref.current.innerHTML = html;
        // Re-execute <script> tags so the scroll handler & mobile toggle bind
        ref.current.querySelectorAll("script").forEach((old) => {
          const s = document.createElement("script");
          if (old.src) s.src = old.src;
          else s.textContent = old.textContent;
          old.replaceWith(s);
        });
      })
      .catch(() => {
        // Dev fallback: render a minimal header
        if (!ref.current) return;
        ref.current.innerHTML = `
          <header id="header" style="position:fixed;top:0;width:100%;z-index:50;background:rgba(30,58,138,0.95);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);">
            <div style="max-width:1280px;margin:0 auto;padding:1rem 2rem;">
              <div style="display:flex;align-items:center;justify-content:space-between;">
                <a href="https://canonical.cc/" style="display:inline-block;">
                  <img src="https://canonical.cc/images/logo-rectangle-trans-short.svg" alt="Canonical" style="height:2rem;width:auto;" />
                </a>
                <nav style="display:flex;align-items:center;gap:2.5rem;">
                  <a href="https://canonical.cc/#about" style="color:rgba(255,255,255,0.8);font-size:0.875rem;font-weight:500;letter-spacing:0.1em;text-decoration:none;">ABOUT</a>
                  <a href="https://blog.canonical.cc" style="color:rgba(255,255,255,0.8);font-size:0.875rem;font-weight:500;letter-spacing:0.1em;text-decoration:none;">BLOG</a>
                  <a href="https://canonical.cc/#thesis" style="color:rgba(255,255,255,0.8);font-size:0.875rem;font-weight:500;letter-spacing:0.1em;text-decoration:none;">THESIS</a>
                  <a href="https://canonical.cc/portfolio" style="color:rgba(255,255,255,0.8);font-size:0.875rem;font-weight:500;letter-spacing:0.1em;text-decoration:none;">PORTFOLIO</a>
                  <div class="nav-dropdown">
                    <a href="https://canonical.cc/labs/" class="nav-dropdown-toggle" style="color:rgba(255,255,255,0.8);font-size:0.875rem;font-weight:500;letter-spacing:0.1em;text-decoration:none;">LABS</a>
                    <div class="nav-dropdown-menu">
                      <a href="https://canonical.cc/labs/dilutionlab/" class="nav-dropdown-item">Dilution Lab</a>
                      <a href="https://canonical.cc/labs/fundmodeler/" class="nav-dropdown-item">Fund Modeler</a>
                      <a href="https://canonical.cc/labs/power-law/" class="nav-dropdown-item">Power Law Lab</a>
                      <a href="https://canonical.cc/physical-ai-robotics/" class="nav-dropdown-item">Physical AI &amp; Robotics</a>
                      <a href="https://canonical.cc/labs/semiconductor-silicon-stack/" class="nav-dropdown-item">Semiconductor Stack</a>
                      <a href="https://canonical.cc/labs/lookalike/" class="nav-dropdown-item">Lookalike Finder</a>
                      <a href="https://canonical.cc/labs/capital-call-planner/" class="nav-dropdown-item">Capital Call Planner</a>
                    </div>
                  </div>
                  <a href="https://canonical.cc/#team" style="color:rgba(255,255,255,0.8);font-size:0.875rem;font-weight:500;letter-spacing:0.1em;text-decoration:none;">TEAM</a>
                </nav>
              </div>
            </div>
          </header>
        `;
      });
  }, []);

  return <div ref={ref} />;
}
