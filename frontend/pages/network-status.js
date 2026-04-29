import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import NodeNetworkVisualization from "../components/NodeNetworkVisualization";
import { fetchNetworkStatus } from "../lib/api";

export default function NetworkStatusPage() {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const data = await fetchNetworkStatus();
        if (mounted) {
          setStatus(data);
        }
      } catch {
        if (mounted) {
          setStatus(null);
        }
      }
    }

    load();
    const interval = setInterval(load, 8000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <Layout
      title="Network Status (Advanced)"
      subtitle="Monitor blockchain services, validator nodes, and smart contract connectivity."
      helpText="This page is useful for administrators and project evaluators."
    >
      <div className="grid gap-5 xl:grid-cols-2">
        <section className="panel p-4 md:p-6">
          <h2 className="text-lg font-semibold text-slate-100">Service Health</h2>
          {!status ? (
            <p className="mt-2 text-sm text-slate-400">Loading network diagnostics...</p>
          ) : (
            <div className="mt-3 grid gap-2 text-sm">
              {Object.entries(status.services || {}).map(([service, state]) => (
                <div key={service} className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-900/65 px-3 py-2">
                  <span className="capitalize text-slate-200">{service}</span>
                  <span className={state === "online" ? "badge-normal" : "badge-suspicious"}>{state}</span>
                </div>
              ))}
            </div>
          )}

          {status?.blockchain ? (
            <div className="mt-4 rounded-xl border border-slate-700 bg-slate-900/65 p-3 text-sm text-slate-300">
              <p>Chain ID: {status.blockchain.chainId}</p>
              <p>Latest Block: {status.blockchain.latestBlock}</p>
              <p>Gas Price (Wei): {status.blockchain.gasPriceWei}</p>
              <p>Node Count: {status.blockchain.nodeCount}</p>
              <p className="break-all text-xs">RPC: {status.blockchain.rpcUrl}</p>
              <p className="break-all text-xs">Contract: {status.contractAddress}</p>
            </div>
          ) : null}
        </section>

        <NodeNetworkVisualization nodes={status?.blockchain?.nodes || []} />
      </div>

      <section className="panel mt-5 p-4 md:p-6">
        <h2 className="text-lg font-semibold text-slate-100">Active Validator Nodes</h2>
        <div className="mt-3 grid gap-2">
          {(status?.blockchain?.nodes || []).map((node) => (
            <div key={node.address} className="rounded-lg border border-slate-700 bg-slate-900/65 p-3 text-sm text-slate-300">
              <p className="text-slate-100">{node.nodeId}</p>
              <p className="break-all font-mono text-xs">{node.address}</p>
              <p className="text-xs text-emerald-300">Status: {node.status}</p>
            </div>
          ))}
        </div>
      </section>
    </Layout>
  );
}
