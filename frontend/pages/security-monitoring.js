import { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import SecurityDashboard from "../components/security/SecurityDashboard";
import {
  getSecurityLogs,
  getSecurityAlerts,
  getSecurityRiskScores,
  getSecurityAnalytics,
  analyzeSecurityUser
} from "../lib/api";

function buildQuery(filters) {
  const query = {};
  if (filters.user_id?.trim()) query.user_id = filters.user_id.trim();
  if (filters.role && filters.role !== "all") query.role = filters.role;
  if (filters.action && filters.action !== "all") query.action = filters.action;
  if (filters.date_from) query.date_from = filters.date_from;
  if (filters.date_to) query.date_to = filters.date_to;
  query.limit = 250;
  return query;
}

export default function SecurityMonitoringPage() {
  const [logs, setLogs] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [scores, setScores] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState("");
  const [analyzeResult, setAnalyzeResult] = useState(null);

  const [filters, setFilters] = useState({
    user_id: "",
    role: "all",
    action: "all",
    date_from: "",
    date_to: ""
  });

  const query = useMemo(() => buildQuery(filters), [filters]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const [logsRes, alertsRes, scoresRes, analyticsRes] = await Promise.all([
          getSecurityLogs(query),
          getSecurityAlerts({ limit: 50 }),
          getSecurityRiskScores({ user_id: query.user_id, limit: 120 }),
          getSecurityAnalytics()
        ]);

        if (!mounted) return;

        setLogs(logsRes.logs || []);
        setAlerts(alertsRes.alerts || []);
        setScores(scoresRes.scores || []);
        setAnalytics(analyticsRes || null);
        setError("");
      } catch (err) {
        if (!mounted) return;
        setError(err.response?.data?.error || err.message);
      }
    }

    load();
    const timer = setInterval(load, 5000);

    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [query]);

  async function handleAnalyzeUser() {
    try {
      const targetUser = filters.user_id?.trim() || logs[0]?.user_id;
      if (!targetUser) {
        setAnalyzeResult({ error: "Enter a user ID in filter to analyze." });
        return;
      }

      const result = await analyzeSecurityUser({
        user_id: targetUser,
        action: "admin_action"
      });
      setAnalyzeResult(result);
    } catch (err) {
      setAnalyzeResult({ error: err.response?.data?.error || err.message });
    }
  }

  return (
    <Layout
      title="Security Monitoring"
      subtitle="AI-driven insider threat detection using behavioral sequence monitoring."
      helpText="This page tracks user behavior logs, risk scores, and alerts. High-risk activity should be reviewed before approving sensitive transactions."
    >
      <div className="mb-5 panel p-4 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-100">Behavior Monitoring Layer: Active</p>
            <p className="text-xs text-slate-400">Logging login, registration, transfer, upload, override, and admin actions.</p>
          </div>
          <button type="button" onClick={handleAnalyzeUser} className="btn-secondary">
            Analyze Selected User
          </button>
        </div>

        {analyzeResult ? (
          <div className="mt-3 rounded-lg border border-slate-700 bg-slate-900/70 p-3 text-sm text-slate-300">
            {analyzeResult.error ? (
              <p className="text-rose-400">{analyzeResult.error}</p>
            ) : (
              <>
                <p>User: {analyzeResult.user_id}</p>
                <p>Risk Score: {Number(analyzeResult.risk_score || 0).toFixed(2)}</p>
                <p>Threat Level: {analyzeResult.threat_level}</p>
                <p>Reason: {analyzeResult.reason}</p>
              </>
            )}
          </div>
        ) : null}

        {error ? <p className="mt-3 text-sm text-rose-400">{error}</p> : null}
      </div>

      <SecurityDashboard
        analytics={analytics}
        alerts={alerts}
        logs={logs}
        scores={scores}
        filters={filters}
        onFilterChange={setFilters}
      />
    </Layout>
  );
}
