import { useState } from "react";

const ROLE = {
  G: "GOALKEEPER",
  D: "DEFENDER",
  M: "MIDFIELDER",
  F: "FORWARD",
};

const FORMATION_SLOTS = {
  "4-2-3-1": [
    [50, 88],
    [14, 70], [38, 72], [62, 72], [86, 70],
    [35, 50], [65, 50],
    [16, 30], [50, 32], [84, 30],
    [50, 12],
  ],
};

function roleOf(player) {
  return player.role || ROLE[player.pos] || "";
}

function FormationPitch({ team, block, color }) {
  const slots = FORMATION_SLOTS[block.formation] || FORMATION_SLOTS["4-2-3-1"];
  return (
    <div className="formation">
      <header>
        <span>Manager</span>
        <strong>{block.manager}</strong>
        <em>{block.formation}</em>
      </header>
      <div className="formation-pitch" style={{ "--kit": color }}>
        {block.xi.map((player, index) => {
          const [x, y] = slots[index] || [50, 50];
          return (
            <span
              key={player.number}
              className="shirt"
              style={{ left: `${x}%`, top: `${y}%` }}
              title={player.name}
            >
              {player.number}
            </span>
          );
        })}
      </div>
      <footer>{team}</footer>
    </div>
  );
}

function PlayerRow({ player }) {
  return (
    <li>
      <b>{player.number}</b>
      <div>
        <span className="name">{player.name}</span>
        <span className="role">{roleOf(player)}</span>
      </div>
      {player.subOut && (
        <img className="sub-ico" src="/icons/substitution.svg" alt="" title={`Off ${player.subOut}`} />
      )}
      {player.subIn && (
        <img className="sub-ico" src="/icons/substitution.svg" alt="" title={`On ${player.subIn}`} />
      )}
    </li>
  );
}

function PlayerList({ title, players }) {
  return (
    <div className="player-list">
      <h3>{title}</h3>
      <ol>
        {players.map((player) => (
          <PlayerRow key={`${player.number}-${player.name}`} player={player} />
        ))}
      </ol>
    </div>
  );
}

export default function LineupsPanel({ match }) {
  const [page, setPage] = useState(0);
  const home = match.lineups.home;
  const away = match.lineups.away;

  const slides = [
    {
      id: "pitch",
      body: (
        <div className="formations">
          <FormationPitch team={match.home.name} block={home} color={match.home.color} />
          <FormationPitch team={match.away.name} block={away} color={match.away.color} />
        </div>
      ),
    },
    {
      id: "away-xi",
      body: <PlayerList title={`${match.away.name} Starting Lineup`} players={away.xi} />,
    },
    {
      id: "away-subs",
      body: <PlayerList title={`${match.away.name} Substitutes`} players={away.subs} />,
    },
    {
      id: "home-subs",
      body: <PlayerList title={`${match.home.name} Substitutes`} players={home.subs} />,
    },
    {
      id: "home-xi",
      body: <PlayerList title={`${match.home.name} Starting Lineup`} players={home.xi} />,
    },
  ];

  return (
    <div className="lineups">
      <div className="lineups-head">
        <strong>Lineups</strong>
        <div className="lineups-pager">
          <button type="button" aria-label="Previous lineup view" onClick={() => setPage((p) => (p + slides.length - 1) % slides.length)}>
            <img src="/icons/chevron-left.svg" alt="" />
          </button>
          <span>{page + 1}/{slides.length}</span>
          <button type="button" aria-label="Next lineup view" onClick={() => setPage((p) => (p + 1) % slides.length)}>
            <img src="/icons/chevron-right.svg" alt="" />
          </button>
        </div>
      </div>
      <div className="lineups-slide" data-slide={slides[page].id}>
        {slides[page].body}
      </div>
    </div>
  );
}
