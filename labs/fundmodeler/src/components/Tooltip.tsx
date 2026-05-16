import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  text: string;
  side?: "top" | "bottom";
  align?: "left" | "center" | "right";
};

export function Tooltip({
  children,
  text,
  side = "bottom",
  align = "center",
}: Props) {
  const sideClass =
    side === "bottom" ? "top-full mt-2" : "bottom-full mb-2";
  const alignClass =
    align === "left"
      ? "left-0"
      : align === "right"
        ? "right-0"
        : "left-1/2 -translate-x-1/2";

  return (
    <span className="group relative inline-flex items-center gap-1 cursor-help">
      <span className="border-b border-dotted border-ink-faint/60">
        {children}
      </span>
      <span
        role="tooltip"
        className={`pointer-events-none absolute ${sideClass} ${alignClass} invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-opacity duration-100 bg-white border border-rule rounded-md shadow-md px-3 py-2 text-xs text-ink-soft normal-case tracking-normal font-normal leading-snug w-60 z-50`}
      >
        {text}
      </span>
    </span>
  );
}
