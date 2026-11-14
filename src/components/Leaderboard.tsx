import { getScores, clearScores } from "../game/scores";

function medal(rank: number): string {
  return rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `${rank}.`;
}

export default function Leaderboard({
  missionId,
  limit = 10,
  highlightId,
  title = "Mission Records",
}: {
  missionId?: string;
  limit?: number;
  highlightId?: string;
  title?: string;
}) {
  const scores = getScores()
    .filter((s) => !missionId || s.missionId === missionId)
    .slice(0, limit);

  return (
    <div className="lb">
      <h3>
        🏆 {title}
        <button className="ghost tiny" onClick={() => clearScores()}>reset</button>
      </h3>
      {scores.length === 0 ? (
        <p className="muted">No missions flown yet. Be the first architect on the board.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th></th>
              <th>Commander</th>
              <th>Mission</th>
              <th>Science</th>
              <th>Health</th>
              <th>Cost</th>
              <th>Grade</th>
            </tr>
          </thead>
          <tbody>
            {scores.map((s) => (
              <tr key={s.id} className={s.id === highlightId ? "me" : ""}>
                <td>{medal(getScores().findIndex((x) => x.id === s.id) + 1)}</td>
                <td><strong>{s.name}</strong></td>
                <td className="muted">{s.missionName}</td>
                <td>{s.science} pts</td>
                <td>{Math.round(s.health * 100)}%</td>
                <td>${Math.round(s.cost)}M</td>
                <td>{s.grade.split(" — ")[0]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
