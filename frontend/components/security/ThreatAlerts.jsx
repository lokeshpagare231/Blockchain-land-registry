function tone(level) {
  if (level === "HIGH") {
    return "border-rose-500/50 bg-rose-500/15 text-rose-200";
  }
  if (level === "SUSPICIOUS") {
    return "border-amber-500/50 bg-amber-500/15 text-amber-200";
  }
  return "border-emerald-500/50 bg-emerald-500/15 text-emerald-200";
}

export default function ThreatAlerts({ alerts = [] }) {
  return (
    <section className="panel p-4 md:p-6">
      <h2 className="text-lg font-semibold text-slate-100">Threat Alerts</h2>
      <p className="mt-1 text-xs text-slate-400">Detected suspicious behavior patterns from sequence analysis.</p>

      <div className="mt-4 space-y-3">
        {alerts.length === 0 ? (
          <div className="rounded-lg border border-emerald-500/35 bg-emerald-500/15 p-3 text-sm text-emerald-200">
            No suspicious behavior detected right now.
          </div>
        ) : (
          alerts.map((alert) => (
            <article key={alert.id} className={`rounded-xl border p-3 ${tone(alert.threat_level)}`}>
              <p className="text-sm font-semibold">{alert.threat_level} Risk Behavior Alert</p>
              <p className="mt-1 text-xs">User: {alert.user_id}</p>
              <p className="text-xs">Role: {alert.role}</p>
              <p className="text-xs">Risk Score: {Number(alert.risk_score || 0).toFixed(2)}</p>
              <p className="mt-1 text-xs">Reason: {alert.reason}</p>
              <p className="mt-1 text-[11px] opacity-80">{new Date(alert.created_at).toLocaleString()}</p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
