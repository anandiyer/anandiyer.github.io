import { useEffect, useState } from "react";

export function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinkStyle = {
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: 500,
  } as const;

  return (
    <header
      id="header"
      className="fixed top-0 w-full bg-transparent z-50 transition-all duration-200"
      style={{
        backgroundColor: scrolled ? "rgba(30, 58, 138, 0.95)" : "transparent",
        backdropFilter: scrolled ? "blur(10px)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(10px)" : "none",
      }}
    >
      <div className="container mx-auto px-8 py-8">
        <div className="flex items-center justify-between">
          <a href="https://canonical.cc" className="logo-link">
            <img
              src="https://canonical.cc/images/logo-rectangle-trans-short.svg"
              alt="Canonical"
              className="h-8 w-auto"
            />
          </a>
          <nav className="hidden md:flex items-center space-x-10">
            <a
              href="https://canonical.cc/#about"
              className="text-sm tracking-[0.1em] transition hover:text-white"
              style={navLinkStyle}
            >
              ABOUT
            </a>
            <a
              href="https://canonical.cc/#thesis"
              className="text-sm tracking-[0.1em] transition hover:text-white"
              style={navLinkStyle}
            >
              THESIS
            </a>
            <a
              href="https://canonical.cc/portfolio"
              className="text-sm tracking-[0.1em] transition hover:text-white"
              style={navLinkStyle}
            >
              PORTFOLIO
            </a>
            <div className="nav-dropdown">
              <button
                type="button"
                className="nav-dropdown-toggle text-sm tracking-[0.1em] transition hover:text-white cursor-pointer"
                style={navLinkStyle}
                aria-haspopup="true"
                aria-expanded="false"
              >
                HACKS
              </button>
              <div className="nav-dropdown-menu" role="menu">
                <a
                  href="https://dilutionlab.canonical.cc"
                  className="nav-dropdown-item"
                  role="menuitem"
                >
                  Dilution Lab
                </a>
                <a
                  href="https://fundmodeler.canonical.cc"
                  className="nav-dropdown-item"
                  role="menuitem"
                >
                  Fund Modeler
                </a>
              </div>
            </div>
            <a
              href="https://canonical.cc/#team"
              className="text-sm tracking-[0.1em] transition hover:text-white"
              style={navLinkStyle}
            >
              TEAM
            </a>
          </nav>
        </div>
      </div>
    </header>
  );
}
