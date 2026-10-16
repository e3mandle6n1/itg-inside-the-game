export default function StandingsTable({ rows, markedOnly = false }) {
  const list = markedOnly ? rows.filter((row) => row.mark) : rows;
  return (
    <table className="table">
      <thead>
        <tr>
          <th>#</th>
          <th>Team</th>
          <th>P</th>
          <th>GD</th>
          <th>Pts</th>
        </tr>
      </thead>
      <tbody>
        {list.map((row) => (
          <tr key={`${row.pos}-${row.team}`} className={row.mark ? "mark" : ""}>
            <td>{row.pos}</td>
            <td>{row.team}</td>
            <td>{row.p}</td>
            <td>{row.gd}</td>
            <td>{row.pts}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
