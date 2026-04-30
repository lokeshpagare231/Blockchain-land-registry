import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export default function TransactionVolumeChart({ blocks = [] }) {
  const labels = blocks.map((block) => `#${block.number}`);
  const values = blocks.map((block) => block.transactionHashes?.length || block.transactions?.length || 0);

  const data = {
    labels,
    datasets: [
      {
        label: "Transactions per block",
        data: values,
        backgroundColor: "rgba(99, 102, 241, 0.8)",
        borderRadius: 8,
        borderSkipped: false
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      }
    },
    scales: {
      x: {
        ticks: { color: "#475569", font: { weight: 'bold' } },
        grid: { color: "rgba(226, 232, 240, 0.6)" }
      },
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
          color: "#475569",
          font: { weight: 'bold' }
        },
        grid: { color: "rgba(226, 232, 240, 0.6)" }
      }
    }
  };

  return (
    <section className="panel p-4 md:p-6 w-full max-w-full overflow-hidden">
      <h2 className="mb-4 text-lg font-black text-slate-100">Transaction Density (Advanced)</h2>
      <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-3 shadow-sm w-full">
        <div className="h-[280px] w-full relative">
          <Bar data={data} options={options} />
        </div>
      </div>
    </section>
  );
}
