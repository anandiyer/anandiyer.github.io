import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { KpiRow } from "./components/KpiRow";
import { JCurveChart } from "./components/JCurveChart";
import { InputsPanel } from "./components/InputsPanel";
import { OutcomesPanel } from "./components/OutcomesPanel";
import { CashflowTable } from "./components/CashflowTable";
import { Actions } from "./components/Actions";
import { useFundStore } from "./store";

function App() {
  const { inputs, result, dispatch } = useFundStore();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 w-full max-w-4xl mx-auto px-6 sm:px-10 pt-28 sm:pt-32 pb-24">
        <div className="flex items-baseline justify-between gap-4 mb-8">
          <div
            className="text-xs uppercase tracking-[0.18em] text-white/55"
            style={{ fontWeight: 500 }}
          >
            canonical · fundmodeler
          </div>
          <Actions
            inputs={inputs}
            years={result.years}
            onReset={() => dispatch({ type: "reset" })}
          />
        </div>

        <Hero
          fundName={inputs.fundName}
          fundSize={inputs.fundSize}
          vintageYear={inputs.vintageYear}
          numInvestments={inputs.numInvestments}
          result={result}
          onRenameFund={(name) =>
            dispatch({ type: "set", patch: { fundName: name } })
          }
        />

        {result.warnings.length > 0 && (
          <div className="mb-6 border border-white/20 bg-white/10 backdrop-blur rounded-md px-4 py-3 text-xs text-white/90 space-y-1">
            {result.warnings.map((w, i) => (
              <div key={i}>{w}</div>
            ))}
          </div>
        )}

        <KpiRow result={result} />

        <div className="mt-10 space-y-6">
          <JCurveChart
            curve={result.curve}
            vintageYear={inputs.vintageYear}
            netTVPI={result.netTVPI}
          />

          <InputsPanel
            inputs={inputs}
            impliedOwnership={result.impliedEntryOwnership}
            reserveAdequacy={result.reserveAdequacy}
            totalFees={result.totalFees}
            onSet={(patch) => dispatch({ type: "set", patch })}
          />

          <OutcomesPanel
            outcomes={inputs.outcomes}
            buckets={result.buckets}
            lifeMax={inputs.fundLife}
            canRemove={inputs.outcomes.length > 1}
            onSetOutcome={(id, patch) =>
              dispatch({ type: "setOutcome", id, patch })
            }
            onAddOutcome={() => dispatch({ type: "addOutcome" })}
            onRemoveOutcome={(id) => dispatch({ type: "removeOutcome", id })}
          />

          <CashflowTable
            years={result.years}
            vintageYear={inputs.vintageYear}
          />
        </div>

        <footer className="mt-16 pt-8 border-t border-white/15 text-xs text-white/65 flex flex-col sm:flex-row sm:justify-between gap-2">
          <div>
            Built by{" "}
            <a
              href="https://canonical.cc"
              target="_blank"
              rel="noreferrer"
              className="text-white/85 hover:text-white"
            >
              Canonical
            </a>
            . Free for any fund manager.
          </div>
          <div>
            Scenarios live in your browser. Share via link — nothing leaves your
            device.
          </div>
        </footer>
      </main>
    </div>
  );
}

export default App;
