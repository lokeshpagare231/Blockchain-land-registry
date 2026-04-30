import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from "chart.js";
import { Line, Doughnut } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export function ActivityLineChart({ blocks = [] }) {
  // Sort blocks ascending for the timeline
  const sortedBlocks = [...blocks].sort((a, b) => a.number - b.number);
  const labels = sortedBlocks.map((b) => `Block #${b.number}`);
  const dataPoints = sortedBlocks.map((b) => b.transactionHashes?.length || b.transactions?.length || 0);

  const data = {
    labels,
    datasets: [
      {
        label: "Transactions",
        data: dataPoints,
        borderColor: "rgba(99, 102, 241, 1)", // Indigo 500
        backgroundColor: "rgba(99, 102, 241, 0.15)",
        borderWidth: 3,
        pointBackgroundColor: "rgba(139, 92, 246, 1)", // Violet 500
        pointBorderColor: "#fff",
        pointHoverBackgroundColor: "#fff",
        pointHoverBorderColor: "rgba(139, 92, 246, 1)",
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: true,
        tension: 0.4 // Smooth curves
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "rgba(15, 23, 42, 0.9)", // slate-900
        titleColor: "#f8fafc",
        bodyColor: "#cbd5e1",
        padding: 12,
        cornerRadius: 8,
        displayColors: false,
      }
    },
    scales: {
      x: {
        ticks: { color: "#94a3b8", font: { family: "Manrope" } },
        grid: { color: "rgba(51, 65, 85, 0.4)", drawBorder: false }
      },
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
          color: "#94a3b8",
          font: { family: "Manrope" }
        },
        grid: { color: "rgba(51, 65, 85, 0.4)", drawBorder: false }
      }
    },
    interaction: {
      mode: "index",
      intersect: false,
    }
  };

  return (
    <div className="h-[260px] w-full">
      <Line data={data} options={options} />
    </div>
  );
}

export function EventDistributionChart({ events = [] }) {
  // Count event types
  const counts = {
    registration: 0,
    transfer: 0,
    update: 0,
    other: 0
  };

  events.forEach(e => {
    const type = String(e.type || "").toLowerCase();
    if (type.includes("register")) counts.registration++;
    else if (type.includes("transfer")) counts.transfer++;
    else if (type.includes("mutat") || type.includes("inherit")) counts.update++;
    else counts.other++;
  });

  const hasData = counts.registration || counts.transfer || counts.update || counts.other;

  const data = {
    labels: ["Registration", "Transfers", "Updates", "Other"],
    datasets: [
      {
        data: hasData ? [counts.registration, counts.transfer, counts.update, counts.other] : [1, 1, 1, 1],
        backgroundColor: [
          "rgba(139, 92, 246, 0.8)", // Violet
          "rgba(56, 189, 248, 0.8)", // Sky
          "rgba(16, 185, 129, 0.8)", // Emerald
          "rgba(100, 116, 139, 0.8)", // Slate
        ],
        borderColor: "rgba(15, 23, 42, 1)", // background color to create gap
        borderWidth: 2,
        hoverOffset: 4
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "75%",
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          color: "#cbd5e1",
          usePointStyle: true,
          padding: 20,
          font: { family: "Manrope", size: 12, weight: "bold" }
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            if (!hasData) return " No data yet";
            let label = context.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed !== null) {
              label += context.parsed;
            }
            return label;
          }
        },
        backgroundColor: "rgba(15, 23, 42, 0.9)",
        titleColor: "#f8fafc",
        bodyColor: "#cbd5e1",
        padding: 12,
        cornerRadius: 8,
      }
    }
  };

  return (
    <div className="h-[260px] w-full relative flex items-center justify-center">
      <Doughnut data={data} options={options} />
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
        <span className="text-3xl font-black text-slate-100">{events.length}</span>
        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Events</span>
      </div>
    </div>
  );
}
