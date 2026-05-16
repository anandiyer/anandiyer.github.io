import type { BucketResult, OutcomeBucket } from "../model/types";
import { fmtDecimal, fmtMoneyCompact, fmtMultiple, fmtPct } from "../lib/format";
import { Tooltip } from "./Tooltip";

type Props = {
  outcomes: OutcomeBucket[];
  buckets: BucketResult[];
  lifeMax: number;
  canRemove: boolean;
  onSetOutcome: (id: string, patch: Partial<OutcomeBucket>) => void;
  onAddOutcome: () => void;
  onRemoveOutcome: (id: string) => void;
};

const HEADER_CLASS =
  "text-[10px] uppercase tracking-wider text-ink-faint font-medium";

const GRID_COLS = "grid-cols-[1fr_72px_72px_60px_1fr_1fr_22px]";

export function OutcomesPanel({
  outcomes,
  buckets,
  lifeMax,
  canRemove,
  onSetOutcome,
  onAddOutcome,
  onRemoveOutcome,
}: Props) {
  const sum = outcomes.reduce((s, o) => s + o.share, 0);
  const sumOk = Math.abs(sum - 1) < 0.005;
  const totalExit = buckets.reduce((s, b) => s + b.exitValue, 0);
  const totalCap = buckets.reduce((s, b) => s + b.capitalInvested, 0);

  return (
    <section className="card p-6 sm:p-8">
      <div className="flex items-baseline justify-between mb-2">
        <h2
          className="text-[11px] uppercase tracking-[0.16em] text-ink-muted"
          style={{ fontWeight: 500 }}
        >
          The portfolio
        </h2>
        <span
          className={`text-xs tabular ${sumOk ? "text-ink-faint" : "text-warning"}`}
        >
          shares · {fmtPct(sum)}
        </span>
      </div>
      <p className="text-sm text-ink-soft mb-6 max-w-2xl">
        Group your portfolio companies into outcome buckets — name them however
        makes sense (IPO, M&amp;A, write-off, fund-returner). Edit the share,
        exit multiple, and exit year to model your expected distribution.
      </p>

      <div className={`grid ${GRID_COLS} gap-x-4 gap-y-3 items-center`}>
        <div className={HEADER_CLASS}>
          <Tooltip
            align="left"
            text="A label for this group of outcomes. Rename freely — e.g., 'Acqui-hire', 'Series B+ winner', 'Total write-off'."
          >
            Bucket
          </Tooltip>
        </div>
        <div className={`${HEADER_CLASS} text-right`}>
          <Tooltip
            align="center"
            text="Percent of your portfolio companies that fall into this bucket. All buckets should sum to 100%."
          >
            Share
          </Tooltip>
        </div>
        <div className={`${HEADER_CLASS} text-right`}>
          <Tooltip
            align="center"
            text="Average multiple on invested capital for companies in this bucket. 0× means full loss; 10× means ten times the money back."
          >
            Multiple
          </Tooltip>
        </div>
        <div className={`${HEADER_CLASS} text-right`}>
          <Tooltip
            align="center"
            text="Year (from fund vintage) when companies in this bucket typically exit and return capital to LPs."
          >
            Exit
          </Tooltip>
        </div>
        <div className={`${HEADER_CLASS} text-right`}>
          <Tooltip
            align="right"
            text="Total dollars invested in this bucket — initial checks plus follow-ons. Pro-rated from your portfolio inputs."
          >
            Capital
          </Tooltip>
        </div>
        <div className={`${HEADER_CLASS} text-right`}>
          <Tooltip
            align="right"
            text="Total gross exit value from this bucket. The blue + number shows how much it adds to the fund's net MOIC."
          >
            Returns
          </Tooltip>
        </div>
        <div></div>

        {outcomes.map((o, i) => {
          const b = buckets[i];
          return (
            <div key={o.id} className="contents group">
              <input
                type="text"
                value={o.label}
                onChange={(e) => onSetOutcome(o.id, { label: e.target.value })}
                aria-label="Bucket label"
                className="text-ink-strong text-sm bg-transparent border-b border-transparent hover:border-rule focus:border-accent focus:outline-none px-0 py-1 -mx-0.5"
              />
              <input
                type="text"
                inputMode="decimal"
                className="tabular text-right rounded border border-rule bg-white px-2 py-1.5 outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 text-sm"
                value={(o.share * 100).toString()}
                onChange={(e) => {
                  const v = Number(e.target.value.replace(/[,\s%]/g, ""));
                  if (!Number.isNaN(v)) onSetOutcome(o.id, { share: v / 100 });
                }}
              />
              <input
                type="text"
                inputMode="decimal"
                className="tabular text-right rounded border border-rule bg-white px-2 py-1.5 outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 text-sm"
                value={o.multiple.toString()}
                onChange={(e) => {
                  const v = Number(e.target.value.replace(/[,\sx×]/g, ""));
                  if (!Number.isNaN(v))
                    onSetOutcome(o.id, { multiple: Math.max(0, v) });
                }}
              />
              <input
                type="text"
                inputMode="numeric"
                className="tabular text-right rounded border border-rule bg-white px-2 py-1.5 outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 text-sm"
                value={Math.round(o.exitYear).toString()}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (!Number.isNaN(v)) {
                    onSetOutcome(o.id, {
                      exitYear: Math.max(1, Math.min(lifeMax, Math.round(v))),
                    });
                  }
                }}
              />
              <div className="text-right text-ink-soft tabular text-sm">
                {fmtMoneyCompact(b?.capitalInvested ?? 0)}
                <span className="text-ink-faint text-xs ml-1">
                  · {fmtDecimal(b?.numCompanies ?? 0, 1)} cos
                </span>
              </div>
              <div className="text-right text-ink-strong tabular text-sm">
                {fmtMoneyCompact(b?.exitValue ?? 0)}
                <span className="text-accent text-xs ml-1">
                  +{fmtMultiple(b?.contributionToMOIC ?? 0, 2)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onRemoveOutcome(o.id)}
                disabled={!canRemove}
                aria-label="Remove bucket"
                title="Remove bucket"
                className="text-ink-faint hover:text-negative opacity-0 group-hover:opacity-100 focus:opacity-100 disabled:opacity-0 disabled:cursor-not-allowed transition-opacity text-base leading-none -mr-1"
              >
                ×
              </button>
            </div>
          );
        })}

        <div className="text-ink-soft text-sm font-medium pt-3 border-t border-rule">
          Total
        </div>
        <div></div>
        <div></div>
        <div></div>
        <div className="text-right text-ink-strong tabular text-sm pt-3 border-t border-rule">
          {fmtMoneyCompact(totalCap)}
        </div>
        <div className="text-right text-ink-strong tabular text-sm pt-3 border-t border-rule">
          {fmtMoneyCompact(totalExit)}
        </div>
        <div className="pt-3 border-t border-rule"></div>
      </div>

      <button
        type="button"
        onClick={onAddOutcome}
        className="mt-5 text-xs text-accent hover:text-accent-hover inline-flex items-center gap-1.5"
      >
        <span className="text-base leading-none">+</span> Add bucket
      </button>
    </section>
  );
}
