import ThreatAlerts from "./ThreatAlerts";
import BehaviorLogsTable from "./BehaviorLogsTable";
import RiskScoreChart from "./RiskScoreChart";
import BehaviorTimeline from "./BehaviorTimeline";

function StatCard({ label, value }) {
  return (
    <article className="rounded-xl border border-slate-700 bg-slate-900/65 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-100">{value}</p>
    </article>
  );
}

export default function SecurityDashboard({ analytics, alerts, logs, scores, filters, onFilterChange }) {
  return (
    <div className="grid gap-5">
      <section className="grid gap-5 2xl:grid-cols-[1.6fr_1fr]">
        <ThreatAlerts alerts={alerts} />
        <section className="panel p-4 md:p-6">
          <h2 className="text-lg font-semibold text-slate-100">Threat Analytics</h2>
          <div className="mt-4 grid gap-3">
            <StatCard label="Total Actions Logged" value={analytics?.total_actions_logged ?? 0} />
            <StatCard label="Suspicious Events" value={analytics?.suspicious_events_detected ?? 0} />
            <StatCard label="High Risk Users" value={analytics?.high_risk_users ?? 0} />
            <StatCard label="Flagged Transactions" value={analytics?.flagged_transactions ?? 0} />
          </div>
        </section>
      </section>

      <section className="grid gap-5 2xl:grid-cols-[2fr_1fr]">
        <BehaviorLogsTable logs={logs} filters={filters} onFilterChange={onFilterChange} />
        <RiskScoreChart scores={scores} />
      </section>

      <BehaviorTimeline logs={logs} scores={scores} />
    </div>
  );
}
