function amount(value) {
  return parseFloat(String(value).replace("%", "")) || 0;
}

export default function StatBars({ rows }) {
  return rows.map((row) => {
    const home = amount(row.home);
    const away = amount(row.away);
    const total = home + away || 1;
    return (
      <div className="stat" key={row.label}>
        <b>{row.home}</b>
        <div>
          <span>{row.label}</span>
          <i><em style={{ width: `${(home / total) * 100}%` }} /></i>
        </div>
        <b>{row.away}</b>
      </div>
    );
  });
}
