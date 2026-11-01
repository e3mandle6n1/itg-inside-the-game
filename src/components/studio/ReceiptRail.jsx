import { useUi } from "../../context/UiContext.jsx";
import AgentPipeline from "./AgentPipeline.jsx";
import ReceiptCard from "./ReceiptCard.jsx";

export default function ReceiptRail({
  receipt,
  busy,
  error,
  clock,
}) {
  const { t } = useUi();

  return (
    <aside className="studio-rail studio-rail-right" aria-label={t("answerTitle")}>
      <div className="studio-rail-head">
        <span className="studio-kicker">{t("answerKicker")}</span>
        <h2>{t("answerTitle")}</h2>
        <p className="studio-rail-lede">{t("answerLede")}</p>
      </div>

      <AgentPipeline receipt={receipt} busy={busy} />

      {error ? <p className="studio-rail-error">{error}</p> : null}
      {busy && !receipt ? <p className="studio-rail-busy">{t("loading")}</p> : null}
      <ReceiptCard receipt={receipt} clock={clock} />
    </aside>
  );
}
