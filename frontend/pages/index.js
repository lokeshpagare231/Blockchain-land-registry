import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import BlockChainViewer from "../components/BlockChainViewer";
import ExecutionLog from "../components/ExecutionLog";
import TransactionVolumeChart from "../components/TransactionVolumeChart";
import { fetchNetworkStatus, getExplorerBlocks, getExplorerEvents, getSecurityAlerts } from "../lib/api";

function friendlyEvent(eventType) {
  const value = String(eventType || "").toLowerCase();
  if (value.includes("registered")) return "A new property was securely registered.";
  if (value.includes("transfer")) return "A property ownership transfer was completed.";
  if (value.includes("inherit")) return "An inheritance ownership update was completed.";
  if (value.includes("mutat")) return "Property details were updated and recorded.";
  return "A ledger update was recorded successfully.";
}

function statusTone(state) {
  return state === "online" ? "badge-normal" : "badge-suspicious";
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
        getSecurityAlerts({ limit: 5 })
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
      { label: "Properties Registered", value: registeredCount },
      { label: "Recent Transactions", value: events.length },
      { label: "Latest Ledger Block", value: networkStatus?.blockchain?.latestBlock ?? "-" },
      { label: "Security Alerts", value: alerts.length }
    ];
  }, [alerts.length, events, networkStatus]);

  return (
    <Layout
      title="Dashboard Overview"
      subtitle="Simple actions for property management with secure blockchain recording running in the background."
      helpText="Use Register Property to add a record, Property Transactions to transfer ownership, and Property Search to verify ownership history."
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <article key={card.label} className="panel-soft animate-fade-up p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">{card.label}</p>
            <p className="mt-2 text-2xl font-bold text-slate-100">{card.value}</p>
          </article>
        ))}
      </section>

      <section className="mt-5 grid gap-4 xl:grid-cols-2">
        <article className="panel p-5">
          <h2 className="text-lg font-semibold text-slate-100">What do you want to do?</h2>
          <p className="mt-2 text-sm text-slate-300">Choose a task below. The system handles blockchain steps automatically.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Link href="/property-registry" className="btn-primary text-center">
              Register Property
            </Link>
            <Link href="/property-transactions" className="btn-secondary text-center">
              Transfer Ownership
            </Link>
            <Link href="/property-search" className="btn-secondary text-center">
              Verify Property
            </Link>
            <Link href="/ai-verification" className="btn-secondary text-center">
              Check Documents
            </Link>
          </div>
        </article>

        <article className="panel p-5">
          <h2 className="text-lg font-semibold text-slate-100">System Status</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {Object.entries(networkStatus?.services || {}).map(([service, state]) => (
              <div key={service} className="rounded-xl border border-slate-700 bg-slate-900/60 p-3">
                <p className="text-sm capitalize text-slate-200">{service}</p>
                <span className={statusTone(state)}>{state}</span>
              </div>
            ))}
            <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-3">
              <p className="text-sm text-slate-200">Ledger Integrity</p>
              <span className={blocksPayload.integrity?.valid ? "badge-normal" : "badge-high"}>
                {blocksPayload.integrity?.valid ? "Healthy" : "Broken"}
              </span>
            </div>
          </div>
        </article>
      </section>

      <section className="mt-5 panel p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-100">Recent Activity</h2>
          <Link href="/property-search" className="text-xs text-cyan-300 hover:text-cyan-200">
            View full history
          </Link>
        </div>
        <div className="space-y-2">
          {events.length === 0 ? (
            <p className="text-sm text-slate-400">No transactions yet.</p>
          ) : (
            events.slice(0, 8).map((event, idx) => (
              <div key={`${event.txHash}-${idx}`} className="rounded-xl border border-slate-700 bg-slate-900/60 p-3">
                <p className="text-sm font-medium text-slate-100">{friendlyEvent(event.type)}</p>
                <p className="mt-1 text-[11px] text-slate-400">{event.type} | block {event.blockNumber}</p>
                <p className="truncate font-mono text-[11px] text-slate-500">{event.txHash}</p>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="mt-5 panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Advanced Technical View</h2>
            <p className="text-xs text-slate-400">For demo and evaluation: blocks, hashes, and smart contract logs.</p>
          </div>
          <button type="button" className="btn-secondary" onClick={() => setShowAdvanced((v) => !v)}>
            {showAdvanced ? "Hide Advanced" : "Show Advanced"}
          </button>
        </div>

        {showAdvanced ? (
          <div className="mt-4 grid gap-5">
            <BlockChainViewer
              blocks={blocksPayload.blocks}
              integrity={blocksPayload.integrity}
              onSelectBlock={setSelectedBlock}
              selectedBlock={selectedBlock}
            />
            <div className="grid gap-5 xl:grid-cols-2">
              <TransactionVolumeChart blocks={blocksPayload.blocks} />
              <ExecutionLog logs={events} />
            </div>
          </div>
        ) : null}
      </section>
    </Layout>
  );
}
