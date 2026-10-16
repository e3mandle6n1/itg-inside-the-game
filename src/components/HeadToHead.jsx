import { useState } from "react";
import { H2H, formWinPct } from "../match";

const PAGES = 3;

export default function HeadToHead({ match }) {
  const [page, setPage] = useState(0);
  const homeColor = match.home.color || "#00003c";
  const awayColor = match.away.color || "#e10000";

  const step = (dir) => {
    setPage((current) => (current + dir + PAGES) % PAGES);
  };

  return (
    <div className="h2h">
      <div className="h2h-toolbar">
        <span className="h2h-title">Head to head</span>
        <div className="h2h-pager">
          <button type="button" aria-label="Previous head-to-head page" onClick={() => step(-1)}>
            <img src="/icons/chevron-left.svg" alt="" />
          </button>
          <span>
            {page + 1}/{PAGES}
          </span>
          <button type="button" aria-label="Next head-to-head page" onClick={() => step(1)}>
            <img src="/icons/chevron-right.svg" alt="" />
          </button>
        </div>
      </div>

      {page === 0 ? <MeetingsPage homeColor={homeColor} awayColor={awayColor} /> : null}
      {page === 1 ? <TopScorersPage homeColor={homeColor} awayColor={awayColor} /> : null}
      {page === 2 ? (
        <FormPage
          homeColor={homeColor}
          awayColor={awayColor}
          homeRows={H2H.form.home}
          awayRows={H2H.form.away}
        />
      ) : null}
    </div>
  );
}

function MeetingsPage({ homeColor, awayColor }) {
  const { home, draw, away } = H2H.meetings;
  const scored = H2H.averageGoals.scored;
  const conceded = H2H.averageGoals.conceded;

  return (
    <div className="h2h-page">
      <h3 className="h2h-section">Previous meetings</h3>
      <div className="h2h-meetings">
        <div className="h2h-meet-col" style={{ color: homeColor }}>
          <strong>{home}</strong>
          <span>Wins</span>
        </div>
        <div className="h2h-meet-col is-draw">
          <strong>{draw}</strong>
          <span>Draws</span>
        </div>
        <div className="h2h-meet-col is-away" style={{ color: awayColor }}>
          <strong>{away}</strong>
          <span style={{ color: awayColor }}>Wins</span>
        </div>
      </div>
      <div className="h2h-meet-bar" aria-hidden="true">
        <i style={{ flex: home || 0.0001, background: homeColor }} />
        <i style={{ flex: draw || 0.0001, background: "#c5cad3" }} />
        <i style={{ flex: away || 0.0001, background: awayColor }} />
      </div>

      <div className="h2h-divider" />

      <h3 className="h2h-section">Average goals</h3>
      <GoalCompare
        label="Scored"
        home={scored.home}
        away={scored.away}
        homeColor={homeColor}
        awayColor={awayColor}
      />
      <GoalCompare
        label="Conceded"
        home={conceded.home}
        away={conceded.away}
        homeColor={homeColor}
        awayColor={awayColor}
      />
    </div>
  );
}

function GoalCompare({ label, home, away, homeColor, awayColor }) {
  const total = Math.max(0.01, Number(home) + Number(away));
  const homePct = (Number(home) / total) * 100;
  const awayPct = (Number(away) / total) * 100;

  return (
    <div className="h2h-goal-row">
      <strong className="h2h-goal-num" style={{ color: homeColor }}>
        {home}
      </strong>
      <div className="h2h-goal-mid">
        <span>{label}</span>
        <div className="h2h-goal-bar" aria-hidden="true">
          <i style={{ flex: homePct, background: homeColor }} />
          <i style={{ flex: awayPct, background: awayColor }} />
        </div>
      </div>
      <strong className="h2h-goal-num is-away">{away}</strong>
    </div>
  );
}

function TopScorersPage({ homeColor, awayColor }) {
  const { home, away } = H2H.topScorers;

  return (
    <div className="h2h-page h2h-page-scorers">
      <h3 className="h2h-section">Top scorers</h3>
      <div className="h2h-scorers">
        <div className="h2h-scorer">
          <strong className="h2h-scorer-goals">{home.goals}</strong>
          <div className="h2h-scorer-meta">
            <b>{home.name}</b>
            <span>
              <FlagCode code={home.country} />
              {home.role}
            </span>
          </div>
        </div>
        <div className="h2h-scorer is-away">
          <div className="h2h-scorer-meta">
            <b>{away.name}</b>
            <span>
              {away.role}
              <FlagCode code={away.country} />
            </span>
          </div>
          <strong className="h2h-scorer-goals">{away.goals}</strong>
        </div>
      </div>
      <div className="h2h-scorer-bar" aria-hidden="true">
        <i style={{ flex: home.goals || 0.0001, background: homeColor }} />
        <i style={{ flex: away.goals || 0.0001, background: awayColor }} />
      </div>
    </div>
  );
}

function FormPage({ homeColor, awayColor, homeRows, awayRows }) {
  const homePct = formWinPct(homeRows);
  const awayPct = formWinPct(awayRows);

  return (
    <div className="h2h-page h2h-page-form">
      <h3 className="h2h-section">Form</h3>
      <div className="h2h-form">
        <FormSide rows={homeRows} side="home" />
        <div className="h2h-form-meters">
          <div className="h2h-form-pcts">
            <strong style={{ color: homeColor }}>{homePct}%</strong>
            <strong style={{ color: awayColor }}>{awayPct}%</strong>
          </div>
          <div className="h2h-form-bars" aria-hidden="true">
            <span className="h2h-form-track">
              <i style={{ height: `${homePct}%`, background: homeColor }} />
            </span>
            <span className="h2h-form-track">
              <i style={{ height: `${awayPct}%`, background: awayColor }} />
            </span>
          </div>
        </div>
        <FormSide rows={awayRows} side="away" />
      </div>
    </div>
  );
}

function FormSide({ rows, side }) {
  return (
    <ul className={`h2h-form-list h2h-form-list-${side}`}>
      {rows.slice(0, 5).map((row, index) => (
        <li key={`${row.opp}-${index}`}>
          {side === "home" ? (
            <>
              <i className={`h2h-result is-${row.result.toLowerCase()}`}>{row.result}</i>
              <VenueMark venue={row.venue} />
              <span className="h2h-opp">{row.opp}</span>
              <span className="h2h-score">{row.score}</span>
            </>
          ) : (
            <>
              <span className="h2h-score">{row.score}</span>
              <span className="h2h-opp">{row.opp}</span>
              <VenueMark venue={row.venue} />
              <i className={`h2h-result is-${row.result.toLowerCase()}`}>{row.result}</i>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}

function FlagCode({ code }) {
  if (!code) return null;
  const iso = String(code).toLowerCase();
  return (
    <img
      className="h2h-flag"
      src={`https://flagcdn.com/w20/${iso}.png`}
      srcSet={`https://flagcdn.com/w40/${iso}.png 2x`}
      width={20}
      alt=""
      loading="lazy"
      decoding="async"
    />
  );
}

function VenueMark({ venue }) {
  if (venue === "a") {
    return <span className="h2h-venue is-away" title="Away">@</span>;
  }
  return (
    <span className="h2h-venue is-home" title="Home" aria-hidden="true">
      <svg viewBox="0 0 12 12" width="11" height="11">
        <path
          d="M1.5 5.2 L6 1.4 L10.5 5.2 V10.2 H7.2 V7 H4.8 V10.2 H1.5 Z"
          fill="currentColor"
        />
      </svg>
    </span>
  );
}
