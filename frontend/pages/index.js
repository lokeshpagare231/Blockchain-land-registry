import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import BlockChainViewer from "../components/BlockChainViewer";
import ExecutionLog from "../components/ExecutionLog";
import TransactionVolumeChart from "../components/TransactionVolumeChart";
import { ActivityLineChart, EventDistributionChart } from "../components/MainCharts";
import { fetchNetworkStatus, getExplorerBlocks, getExplorerEvents, getSecurityAlerts } from "../lib/api";

function friendlyEvent(eventType) {
  const value = String(eventType || "").toLowerCase();
  if (value.includes("registered")) return "Property Registered";
  if (value.includes("transfer")) return "Ownership Transfer";
  if (value.includes("inherit")) return "Inheritance Update";
  if (value.includes("mutat")) return "Details Updated";
  return "Ledger Update";
}

function statusTone(state) {
  return state === "online" ? "badge-success" : "badge-suspicious";
}

export default function HomePage() {
  const [networkStatus, setNetworkStatus] = useState(null);
  const [blocksPayload, setBlocksPayload] = useState({ blocks: [], integrity: { valid: true } });
  const [events, setEvents] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState(null);

  useEffect(() => {
    async function load() {
      const [network, blocks, contractEvents, alertRes] = await Promise.all([
        fetchNetworkStatus(),
        getExplorerBlocks(12),
        getExplorerEvents(20),
        getSecurityAlerts({ limit: 10 })
      ]);

      setNetworkStatus(network);
      setBlocksPayload(blocks);
      setEvents(contractEvents.events || []);
      setAlerts(alertRes.alerts || []);
      if (blocks.blocks?.length) {
        setSelectedBlock(blocks.blocks.at(-1).number);
      }
    }

    load().catch(console.error);
  }, []);

  const cards = useMemo(() => {
    const registeredCount = events.filter((event) => String(event.type || "").toLowerCase().includes("registered")).length;
    return [
      { label: "Total Transactions", value: events.length || "0", increase: "Recorded", icon: "📦", color: "from-violet-500 to-fuchsia-500" },
      { label: "Active Properties", value: registeredCount || "0", increase: "Secured", icon: "🏠", color: "from-blue-500 to-cyan-500" },
      { label: "Total Blocks", value: networkStatus?.blockchain?.latestBlock ?? "0", increase: "Mined", icon: "⛓️", color: "from-emerald-400 to-teal-500" },
      { label: "Security Alerts", value: alerts.length || "0", increase: "Monitored", icon: "🛡️", color: "from-amber-400 to-orange-500" }
    ];
  }, [events, networkStatus, alerts]);

  return (
    <Layout
      title=""
      subtitle=""
      helpText=""
    >
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-indigo-900/40 via-slate-900/80 to-violet-900/40 border border-slate-700 p-8 md:p-12 shadow-lg mb-8">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-gradient-to-br from-indigo-500/20 to-violet-500/20 blur-3xl rounded-full"></div>
        <div className="absolute bottom-0 right-40 w-72 h-72 bg-gradient-to-tl from-cyan-500/20 to-blue-500/20 blur-3xl rounded-full"></div>
        
        <div className="relative z-10 max-w-2xl">
          <p className="text-indigo-400 font-extrabold text-sm tracking-wider uppercase mb-3">Next Generation Security</p>
          <h1 className="text-4xl md:text-5xl font-black text-slate-100 leading-tight tracking-tight">
            Secure. Immutable. <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">Protected.</span>
          </h1>
          <p className="mt-4 text-lg font-bold text-slate-300 mb-8 max-w-xl">
            Blockguard Land Registry System is a fast, secure and scalable blockchain network designed to eliminate fraud in property management.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/property-registry" className="btn-primary shadow-[0_4px_14px_rgba(99,102,241,0.25)] font-bold px-6 py-3">
              Register Property →
            </Link>
            <Link href="/security-monitoring" className="btn-secondary bg-slate-800/80 backdrop-blur-md font-bold px-6 py-3 text-slate-200">
              View Security Center 🛡️
            </Link>
          </div>
        </div>
        
        <div className="absolute right-10 top-1/2 -translate-y-1/2 hidden lg:block">
          <div className="relative w-64 h-64">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-[32px] rotate-12 opacity-20 blur-xl"></div>
            <div className="absolute inset-0 bg-slate-900/60 border border-slate-700 rounded-[32px] shadow-lg flex items-center justify-center transform hover:-translate-y-2 transition-transform duration-500">
              <span className="text-8xl font-black text-indigo-400">B</span>
            </div>
          </div>
        </div>
      </section>

      {/* Stat Cards */}
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4 mb-8">
        {cards.map((card) => (
          <article key={card.label} className="panel p-5 flex items-center gap-4 hover:-translate-y-1 transition-transform duration-300 border-slate-700/60 bg-slate-900/50">
            <div className={`w-14 h-14 rounded-[16px] bg-gradient-to-br ${card.color} flex items-center justify-center text-2xl shadow-md`}>
              {card.icon}
            </div>
            <div>
              <p className="text-sm font-extrabold text-slate-400 mb-1">{card.label}</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-black text-slate-100">{card.value}</p>
                <span className="text-xs font-bold text-slate-500">{card.increase}</span>
              </div>
            </div>
          </article>
        ))}
      </section>

      {/* Analytics Overview */}
      <section className="grid gap-6 xl:grid-cols-3 mb-8">
        <article className="panel p-6 border-slate-700 bg-slate-900/60 xl:col-span-2 flex flex-col">
          <h2 className="text-xl font-black text-slate-100 mb-6">Network Activity Overview</h2>
          <div className="flex-1 min-h-[260px]">
            <ActivityLineChart blocks={blocksPayload.blocks} />
          </div>
        </article>
        <article className="panel p-6 border-slate-700 bg-slate-900/60 flex flex-col">
          <h2 className="text-xl font-black text-slate-100 mb-6">Transaction Types</h2>
          <div className="flex-1 min-h-[260px] flex items-center justify-center">
            <EventDistributionChart events={events} />
          </div>
        </article>
      </section>

      {/* Main Dashboard Content - Security & Activity */}
      <section className="grid gap-6 xl:grid-cols-2">
        {/* Security Monitoring Panel */}
        <article className="panel p-6 border-slate-700 bg-slate-900/60">
          <div className="flex items-center justify-between mb-6 border-b border-slate-700 pb-4">
            <h2 className="text-xl font-black text-slate-100">Live Security Monitoring</h2>
            <Link href="/security-monitoring" className="text-sm font-bold text-indigo-300 hover:text-indigo-200 bg-indigo-500/20 px-3 py-1 rounded-full">
              Full Dashboard
            </Link>
          </div>
          
          <div className="space-y-4">
            {alerts.length === 0 ? (
              <div className="py-8 text-center bg-slate-800/50 rounded-[16px] border border-slate-700">
                <p className="text-slate-400 font-bold">No security alerts detected. System is secure.</p>
              </div>
            ) : (
              alerts.slice(0, 5).map((alert, idx) => {
                const isHighRisk = alert.riskScore > 0.6;
                return (
                  <div key={`${alert.propertyId}-${idx}`} className="flex flex-col p-4 rounded-[16px] bg-slate-800/50 border border-slate-700 hover:bg-indigo-500/10 transition-colors">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <span className={isHighRisk ? "badge-high" : "badge-suspicious"}>
                          {isHighRisk ? "High Risk" : "Suspicious"}
                        </span>
                        <span className="text-sm font-extrabold text-slate-200">Property #{alert.propertyId}</span>
                      </div>
                      <span className="text-xs font-bold text-slate-500">{new Date(alert.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-sm font-bold text-slate-300 mb-2">
                      Risk Score: {(alert.riskScore * 100).toFixed(0)}%
                    </p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {alert.reasons?.map((reason, i) => (
                        <span key={i} className="px-2 py-1 bg-slate-800 border border-slate-600 rounded text-xs font-bold text-slate-300">
                          {reason}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </article>

        {/* Recent Activity */}
        <article className="panel p-6 border-slate-700 bg-slate-900/60">
          <div className="mb-6 flex items-center justify-between border-b border-slate-800 pb-4">
            <h2 className="text-xl font-black text-slate-100">Recent Transactions</h2>
            <Link href="/property-search" className="text-sm font-bold text-indigo-300 hover:text-indigo-200 bg-indigo-500/20 px-3 py-1 rounded-full">
              View Ledger
            </Link>
          </div>
          
          <div className="space-y-3">
            {events.length === 0 ? (
              <div className="py-8 text-center bg-slate-800/50 rounded-[16px] border border-slate-700">
                <p className="text-slate-400 font-bold">No recent transactions to display.</p>
              </div>
            ) : (
              events.slice(0, 6).map((event, idx) => (
                <div key={`${event.txHash}-${idx}`} className="flex items-center gap-4 p-3 rounded-[16px] bg-slate-800/50 border border-slate-700 hover:bg-indigo-500/10 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold shrink-0">
                    {event.type?.includes("Registered") ? "📄" : event.type?.includes("Transfer") ? "🔄" : "⚡"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-slate-100 truncate">{friendlyEvent(event.type)}</p>
                    <p className="text-xs font-bold text-slate-400 truncate">{event.txHash}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-slate-400 mb-1">Block {event.blockNumber}</p>
                    <span className="badge-normal">Confirmed</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </article>
      </section>

      <section className="mt-8 panel-soft p-6 border-slate-800 bg-slate-900/40 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-slate-100">Advanced Technical View</h2>
            <p className="text-sm font-bold text-slate-400">For developers and node operators</p>
          </div>
          <button type="button" className="btn-secondary border-slate-700 text-slate-300 hover:text-white font-bold" onClick={() => setShowAdvanced((v) => !v)}>
            {showAdvanced ? "Hide Advanced" : "Show Advanced Logs"}
          </button>
        </div>

        {showAdvanced ? (
          <div className="mt-6 grid gap-6">
            <BlockChainViewer
              blocks={blocksPayload.blocks}
              integrity={blocksPayload.integrity}
              onSelectBlock={setSelectedBlock}
              selectedBlock={selectedBlock}
            />
            <div className="grid gap-6 xl:grid-cols-2">
              <TransactionVolumeChart blocks={blocksPayload.blocks} />
              <ExecutionLog logs={events} />
            </div>
          </div>
        ) : null}
      </section>
    </Layout>
  );
}
