import type { ReactNode } from "react";

/**
 * Power-law-lab-style tooltip with amber accent.
 * Renders an (i) icon that shows a floating tooltip on hover.
 *
 * Usage:
 *   <Tip tip={<><strong>Net TVPI.</strong> Total value relative to paid-in capital...</>} />
 *   <Tip tip="simple text" below />
 */
export function Tip({
  tip,
  below,
  alignLeft,
  className = "",
}: {
  tip: ReactNode;
  below?: boolean;
  alignLeft?: boolean;
  className?: string;
}) {
  const contentClasses = [
    "tip-content",
    below ? "tip-below" : "",
    alignLeft ? "tip-left" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={`tip-wrap ${className}`} tabIndex={0}>
      <span className="tip-icon">i</span>
      <span className={contentClasses}>{tip}</span>
    </span>
  );
}
