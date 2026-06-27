import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { Hero } from "./components/Hero";
import { KpiRow } from "./components/KpiRow";
import { JCurveChart } from "./components/JCurveChart";
import { InputsPanel } from "./components/InputsPanel";
import { OutcomesPanel } from "./components/OutcomesPanel";
import { CashflowTable } from "./components/CashflowTable";
import { Actions } from "./components/Actions";
import { ShareStrip, ShareFab } from "./components/ShareWidget";
import { useFundStore } from "./store";

function Explainer() {
  return (
    <section
      style={{
        maxWidth: "720px",
        margin: "0 auto 3rem",
        textAlign: "center",
      }}
    >
      <h1
        style={{
          fontSize: "clamp(2rem, 5vw, 3rem)",
          fontWeight: 300,
          color: "#fff",
          lineHeight: 1.15,
          margin: "0 0 1.25rem",
        }}
      >
        Model your VC fund.
      </h1>
      <p
        style={{
          fontSize: "1.05rem",
          lineHeight: 1.7,
          color: "rgba(255,255,255,0.75)",
          margin: "0 0 2rem",
        }}
      >
        Describe a fund &mdash; its size, portfolio construction, reserves,
        fee structure, and how your companies exit &mdash; and see the full
        picture: TVPI, DPI, IRR, the J-curve, and year-by-year cashflows.
        Everything runs in your browser. Nothing leaves your device.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1.5rem",
          maxWidth: "660px",
          margin: "0 auto",
          textAlign: "left",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "0.8rem",
              fontWeight: 600,
              color: "#facc15",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: "6px",
            }}
          >
            If you&rsquo;re an LP
          </div>
          <p
            style={{
              fontSize: "0.85rem",
              lineHeight: 1.6,
              color: "rgba(255,255,255,0.65)",
              margin: 0,
            }}
          >
            Plug in a manager&rsquo;s stated strategy. See whether their
            projected returns require heroic assumptions or fall within
            plausible range. Use this before the IC meeting.
          </p>
        </div>
        <div>
          <div
            style={{
              fontSize: "0.8rem",
              fontWeight: 600,
              color: "#facc15",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: "6px",
            }}
          >
            If you&rsquo;re a GP
          </div>
          <p
            style={{
              fontSize: "0.85rem",
              lineHeight: 1.6,
              color: "rgba(255,255,255,0.65)",
              margin: 0,
            }}
          >
            Show your LPs how fund size, reserves, and portfolio construction
            interact. Share a scenario link in your deck &mdash; they can
            tweak the inputs themselves.
          </p>
        </div>
        <div>
          <div
            style={{
              fontSize: "0.8rem",
              fontWeight: 600,
              color: "#facc15",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: "6px",
            }}
          >
            If you&rsquo;re curious
          </div>
          <p
            style={{
              fontSize: "0.85rem",
              lineHeight: 1.6,
              color: "rgba(255,255,255,0.65)",
              margin: 0,
            }}
          >
            Change the outcome buckets and watch how a single fund-returner
            transforms the entire J-curve. Most of your returns come from
            one or two calls.
          </p>
        </div>
      </div>
      <div style={{ marginTop: "2.5rem", textAlign: "left" }}>
        <ShareStrip />
      </div>
    </section>
  );
}

function App() {
  const { inputs, result, dispatch } = useFundStore();

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header />
      <main
        style={{
          flex: 1,
          width: "100%",
          maxWidth: "80rem",
          marginLeft: "auto",
          marginRight: "auto",
          paddingLeft: "1.5rem",
          paddingRight: "1.5rem",
          paddingTop: "8rem",
          paddingBottom: "6rem",
        }}
      >
        <Explainer />

        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: "1rem",
            marginBottom: "2rem",
          }}
        >
          <div
            style={{
              fontSize: "0.75rem",
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              color: "rgba(255,255,255,0.55)",
            }}
          >
            canonical &middot; fundmodeler
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
          <div
            style={{
              marginBottom: "1.5rem",
              borderRadius: "0.375rem",
              padding: "0.75rem 1rem",
              fontSize: "0.75rem",
              background:
                "linear-gradient(135deg, rgba(250,204,21,0.12), rgba(251,191,36,0.06))",
              border: "1px solid rgba(250,204,21,0.35)",
              color: "rgba(255,255,255,0.9)",
            }}
          >
            {result.warnings.map((w, i) => (
              <div key={i} style={{ marginTop: i > 0 ? "0.25rem" : 0 }}>
                {w}
              </div>
            ))}
          </div>
        )}

        <KpiRow result={result} />

        <div style={{ marginTop: "2.5rem" }}>
          <div style={{ marginBottom: "1.5rem" }}>
            <JCurveChart
              curve={result.curve}
              vintageYear={inputs.vintageYear}
              netTVPI={result.netTVPI}
            />
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <InputsPanel
              inputs={inputs}
              impliedOwnership={result.impliedEntryOwnership}
              reserveAdequacy={result.reserveAdequacy}
              totalFees={result.totalFees}
              onSet={(patch) => dispatch({ type: "set", patch })}
            />
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
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
          </div>

          <div>
            <CashflowTable
              years={result.years}
              vintageYear={inputs.vintageYear}
            />
          </div>
        </div>

        <div
          style={{
            marginTop: "4rem",
            paddingTop: "2rem",
            borderTop: "1px solid rgba(255,255,255,0.15)",
            color: "rgba(255,255,255,0.65)",
            fontSize: "0.75rem",
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            gap: "0.5rem",
          }}
        >
          <div>
            Built by{" "}
            <a
              href="https://canonical.cc"
              target="_blank"
              rel="noreferrer"
              style={{ color: "rgba(255,255,255,0.85)" }}
              onMouseOver={(e) =>
                (e.currentTarget.style.color = "rgba(255,255,255,1)")
              }
              onMouseOut={(e) =>
                (e.currentTarget.style.color = "rgba(255,255,255,0.85)")
              }
            >
              Canonical
            </a>
            . Free for any fund manager.
          </div>
          <div>
            Scenarios live in your browser. Share via link — nothing leaves your
            device.
          </div>
        </div>
      </main>
      <Footer />
      <ShareFab />
    </div>
  );
}

export default App;
