export default function SubTip({ match, event }) {
  if (!event) return null;

  const side = event.team === "away" ? "away" : "home";
  const team = side === "away" ? match.away : match.home;
  const { on, off } = parseSubPlayers(event);
  const onLine = playerLine(match, side, on);
  const offLine = playerLine(match, side, off);

  return (
    <div className="sub-tip" role="status">
      <div className="sub-tip-card">
        <div className="sub-tip-title">Substitution</div>
        <div className="sub-tip-team">{team.name}</div>
        {onLine ? (
          <div className="sub-tip-row is-on">
            <ArrowIn />
            <span>{onLine}</span>
          </div>
        ) : null}
        {offLine ? (
          <div className="sub-tip-row is-off">
            <ArrowOut />
            <span>{offLine}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function parseSubPlayers(event) {
  const raw = String(event?.player || "").trim();
  if (!raw) return { off: "", on: "" };
  const [off = "", on = ""] = raw.split("/").map((part) => part.trim());
  return { off, on };
}

function playerLine(match, side, name) {
  if (!name) return "";
  const number = lookupNumber(match, side, name);
  const short = shortName(name);
  return number ? `${number} ${short}` : short;
}

function lookupNumber(match, side, name) {
  const block = match?.lineups?.[side];
  if (!block) return "";
  const want = normalizeName(name);
  const pool = [...(block.xi || []), ...(block.subs || [])];
  const hit = pool.find((player) => normalizeName(player.name) === want);
  return hit?.number ? String(hit.number) : "";
}

function normalizeName(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

function shortName(name) {
  const raw = String(name || "").trim();
  if (!raw) return "";
  const [last, first] = raw.split(",").map((part) => part.trim());
  if (!first) return last;
  return `${first.charAt(0).toUpperCase()}. ${last}`;
}

function ArrowIn() {
  return (
    <svg className="sub-tip-arrow is-in" viewBox="0 0 12 12" aria-hidden="true">
      <path
        fill="#1bbf4a"
        d="M1.4 1.4 H7.2 L5.6 3 9.8 7.2 7.6 9.4 3.4 5.2 1.8 6.8 Z"
      />
    </svg>
  );
}

function ArrowOut() {
  return (
    <svg className="sub-tip-arrow is-out" viewBox="0 0 12 12" aria-hidden="true">
      <path
        fill="#e10600"
        d="M10.6 10.6 H4.8 L6.4 9 2.2 4.8 4.4 2.6 8.6 6.8 10.2 5.2 Z"
      />
    </svg>
  );
}
