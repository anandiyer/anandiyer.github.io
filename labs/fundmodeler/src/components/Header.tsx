import { useEffect, useRef, useState } from "react";

export function Header() {
  const [html, setHtml] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("https://canonical.cc/partials/header.html", { cache: "no-store" })
      .then((r) => r.text())
      .then(setHtml)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!html || !ref.current) return;
    ref.current.querySelectorAll("script").forEach((oldScript) => {
      const next = document.createElement("script");
      Array.from(oldScript.attributes).forEach((a) =>
        next.setAttribute(a.name, a.value),
      );
      next.text = oldScript.textContent || "";
      oldScript.parentNode?.replaceChild(next, oldScript);
    });
  }, [html]);

  return <div ref={ref} dangerouslySetInnerHTML={{ __html: html }} />;
}
