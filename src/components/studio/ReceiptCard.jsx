import { useUi } from "../../context/UiContext.jsx";

export default function ReceiptCard({ receipt, clock }) {
  const { t } = useUi();
  if (!receipt) return null;

  const chart = receipt.chart;
  const maxBar = chart
    ? Math.max(1, ...chart.bars.flatMap((bar) => [bar.a || 0, bar.b || 0]))
    : 1;

  const groundedOk = receipt.status === "live" && receipt.inScope !== false;
  const foundry = String(receipt.model || "").startsWith("foundry:");
  const stamp = clock || receipt.clock || "";

  return (
    <article className="receipt-card">
      <header className="receipt-card-head">
        <div className="receipt-hero-row">
          <span className={`receipt-factcheck${groundedOk ? " is-ok" : " is-fail"}`}>
            {groundedOk ? t("factChecked") : t("factCheckedFail")}
          </span>
          {stamp ? (
            <span className="receipt-computed">{t("computedAt")} {stamp}</span>
          ) : null}
        </div>
        <p className="receipt-question">{receipt.question}</p>
        <div className="receipt-badges">
          <span className={`receipt-badge${foundry ? " is-foundry" : " is-meta"}`}>
            {foundry ? t("viaFoundry") : t("viaRules")} · {receipt.model}
          </span>
          <span className="receipt-badge is-grounded">
            {receipt.grounded} {t("numbersChecked")}
          </span>
          <span className="receipt-badge is-meta">{receipt.latency}</span>
        </div>
        {receipt.toolsUsed?.length ? (
          <p className="receipt-tools">
            {t("toolsUsed")}: {receipt.toolsUsed.join(" · ")}
          </p>
        ) : null}
      </header>

      <p className="receipt-narrative">{receipt.narrative}</p>

      <div className="receipt-figures">
        {receipt.figures.map((fig) => (
          <div className="receipt-figure" key={fig.evidence || fig.label}>
            <strong>{fig.value}</strong>
            <span>{fig.label}</span>
          </div>
        ))}
      </div>

      {chart ? (
        <div className="receipt-chart">
          <div className="receipt-chart-title">{chart.title}</div>
          <div className="receipt-chart-legend">
            <span><i className="a" /> {chart.bars[0]?.aLabel || "A"}</span>
            {chart.bars[0]?.bLabel ? (
              <span><i className="b" /> {chart.bars[0].bLabel}</span>
            ) : null}
          </div>
          <ul className="receipt-chart-bars">
            {chart.bars.map((bar) => (
              <li key={bar.name}>
                <span className="receipt-chart-name">{bar.name}</span>
                <div className="receipt-chart-track">
                  <em className="a" style={{ width: `${(bar.a / maxBar) * 100}%` }} title={String(bar.a)} />
                  {bar.bLabel ? (
                    <em className="b" style={{ width: `${(bar.b / maxBar) * 100}%` }} title={String(bar.b)} />
                  ) : null}
                </div>
                <span className="receipt-chart-vals">
                  {bar.a}{bar.bLabel ? ` / ${bar.b}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {receipt.caveats?.length ? (
        <footer className="receipt-caveats">
          <strong>{t("caveatsTitle")}</strong>
          <ul>
            {receipt.caveats.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </footer>
      ) : null}
    </article>
  );
}
