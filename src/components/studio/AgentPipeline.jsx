import { useUi } from "../../context/UiContext.jsx";

function ms(value) {
  if (value == null) return "";
  return value < 1000 ? `${value} ms` : `${(value / 1000).toFixed(1)} s`;
}

/**
 * Tools → Foundry → Ground, labelled with the timings the API measured.
 * While a request is in flight the steps are simply pending; nothing is animated
 * that the backend did not report.
 */
export default function AgentPipeline({ receipt, busy }) {
  const { t } = useUi();
  const stages = receipt?.stages;
  const usage = receipt?.usage;
  const model = String(receipt?.model || "");
  const foundry = model.startsWith("foundry:");

  let foundryDetail = "";
  if (stages) {
    if (usage?.modelCalls > 0) {
      const tokens = (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0);
      foundryDetail = `${ms(stages.modelMs)} · ${usage.modelCalls} call${usage.modelCalls === 1 ? "" : "s"} · ${tokens} tok`;
    } else {
      foundryDetail = t("pipeNoModel");
    }
  }

  const steps = [
    {
      id: "tools",
      label: t("pipeTools"),
      detail: stages
        ? `${ms(stages.toolsMs)} · ${receipt.toolsUsed?.length ?? 0} ${t("pipeToolsUnit")}`
        : "",
    },
    {
      id: "foundry",
      label: `${t("pipeFoundry")}${stages ? (foundry ? " · live" : " · rules") : ""}`,
      detail: foundryDetail,
    },
    {
      id: "ground",
      label: t("pipeGround"),
      detail: stages
        ? `${ms(stages.groundMs)} · ${receipt.grounded ?? 0} ${t("numbersChecked")}`
        : "",
    },
  ];

  const state = busy ? "is-busy" : stages ? "is-done" : "";

  return (
    <ol className="agent-pipe" aria-label={t("pipeTitle")} aria-busy={busy || undefined}>
      {steps.map((step, index) => (
        <li key={step.id} className={`agent-pipe-step ${state}`.trim()}>
          <span className="agent-pipe-index">{index + 1}</span>
          <span className="agent-pipe-body">
            <strong>{step.label}</strong>
            <em>{busy ? t("pipePending") : step.detail}</em>
          </span>
        </li>
      ))}
    </ol>
  );
}
