import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  ArcElement
} from "chart.js";
import { Line, Doughnut } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, ArcElement);

export default function RiskScoreChart({ scores = [] }) {
  const ordered = [...scores].reverse().slice(-20);
  const labels = ordered.map((item) => new Date(item.timestamp).toLocaleTimeString());
  const values = ordered.map((item) => Number(item.risk_score || 0));

  const latest = scores[0] ? Number(scores[0].risk_score || 0) : 0;
  const latestPercent = Math.round(latest * 100);

  const lineData = {
    labels,
    datasets: [
      {
        label: "Risk Score Over Time",
        data: values,
        borderColor: "#22d3ee",
        backgroundColor: "rgba(34, 211, 238, 0.2)",
        tension: 0.25,
        fill: true
      }
    ]
  };

  const gaugeData = {
    labels: ["Risk", "Remaining"],
    datasets: [
      {
        data: [latestPercent, 100 - latestPercent],
        backgroundColor: [latest >= 0.6 ? "#fb7185" : latest >= 0.3 ? "#fbbf24" : "#34d399", "#334155"],
        borderWidth: 0
      }
    ]
  };

  return (
    <section className="panel p-4 md:p-6">
      <h2 className="text-lg font-semibold text-slate-100">Risk Score Visualization</h2>
      <p className="mt-1 text-xs text-slate-400">Green: normal, yellow: suspicious, red: high risk.</p>

      <div className="mt-4 grid gap-4 2xl:grid-cols-1">
        <div className="rounded-xl border border-slate-700 bg-slate-900/65 p-3">
          <Line
            data={lineData}
            options={{
              responsive: true,
              plugins: { legend: { display: false } },
              scales: {
                y: {
                  min: 0,
                  max: 1,
                  ticks: { color: "#94a3b8" },
                  grid: { color: "rgba(71, 85, 105, 0.25)" }
                },
                x: {
                  ticks: { color: "#94a3b8", maxRotation: 0 },
                  grid: { color: "rgba(71, 85, 105, 0.25)" }
                }
              }
            }}
          />
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-900/65 p-3">
          <div className="mx-auto max-w-[220px]">
            <Doughnut data={gaugeData} options={{ cutout: "72%", plugins: { legend: { display: false } } }} />
          </div>
          <p className="mt-2 text-center text-sm font-semibold text-slate-100">Current Risk: {latest.toFixed(2)}</p>
        </div>
      </div>
    </section>
  );
}
