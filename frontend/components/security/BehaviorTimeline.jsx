function actionLabel(action) {
  return action
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function levelTone(level) {
  if (level === "HIGH") return "bg-rose-500/15 border-rose-500/45";
  if (level === "SUSPICIOUS") return "bg-amber-500/15 border-amber-500/45";
  return "bg-emerald-500/15 border-emerald-500/45";
}

export default function BehaviorTimeline({ logs = [], scores = [] }) {
  const topScoresByUser = new Map();
  for (const score of scores) {
    if (!topScoresByUser.has(score.user_id)) {
      topScoresByUser.set(score.user_id, score.threat_level);
    }
  }

  return (
    <section className="panel p-4 md:p-6">
      <h2 className="text-lg font-semibold text-slate-100">Behavior Timeline</h2>
      <p className="mt-1 text-xs text-slate-400">Sequence of actions to inspect suspicious behavior progression.</p>

      <div className="mt-4 space-y-3">
        {logs.length === 0 ? (
          <p className="text-sm text-slate-400">No behavioral events available.</p>
        ) : (
          logs.slice(0, 20).map((log, index) => {
            const isLast = index === Math.min(19, logs.length - 1);
            return (
              <div key={log.id} className="flex gap-3">
                <div className="mt-1 flex flex-col items-center">
                  <span className="h-3 w-3 rounded-full bg-cyan-300" />
                  {!isLast ? <span className="mt-1 h-full w-[2px] bg-slate-700" /> : null}
                </div>
                <article className={`w-full rounded-lg border p-3 text-slate-200 ${levelTone(topScoresByUser.get(log.user_id) || "NORMAL")}`}>
                  <p className="text-sm font-semibold">{actionLabel(log.action)}</p>
                  <p className="mt-1 text-xs">User: {log.user_id} ({log.role})</p>
                  <p className="text-xs">Property: {log.property_id || "-"}</p>
                  <p className="text-xs">Time: {new Date(log.timestamp).toLocaleString()}</p>
                </article>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
