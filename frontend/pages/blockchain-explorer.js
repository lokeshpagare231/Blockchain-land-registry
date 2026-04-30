import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import BlockChainViewer from "../components/BlockChainViewer";
import TransactionVolumeChart from "../components/TransactionVolumeChart";
import ExecutionLog from "../components/ExecutionLog";
import { getExplorerBlocks, getExplorerEvents, getBlockDetails, getTransactionDetails } from "../lib/api";

function StatRow({ label, value, mono = false }) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-3 shadow-sm w-full max-w-full overflow-hidden">
      <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 text-sm font-bold text-slate-200 ${mono ? "break-all font-mono text-[11px]" : "truncate"}`}>{value}</p>
    </div>
  );
}

export default function BlockchainExplorerPage() {
  const [blocksPayload, setBlocksPayload] = useState({ blocks: [], integrity: { valid: true } });
  const [events, setEvents] = useState([]);
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [blockDetails, setBlockDetails] = useState(null);
  const [txDetails, setTxDetails] = useState(null);

  useEffect(() => {
    async function load() {
      const [blocks, contractEvents] = await Promise.all([getExplorerBlocks(25), getExplorerEvents(50)]);
      setBlocksPayload(blocks);
      setEvents(contractEvents.events || []);
      if (blocks.blocks?.length) {
        setSelectedBlock(blocks.blocks.at(-1).number);
      }
    }

    load().catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedBlock === null) {
      return;
    }

    getBlockDetails(selectedBlock)
      .then((block) => {
        setBlockDetails(block);
        const firstTx = block.transactions?.[0]?.hash;
        if (firstTx) {
          getTransactionDetails(firstTx).then(setTxDetails).catch(() => setTxDetails(null));
        } else {
          setTxDetails(null);
        }
      })
      .catch(() => setBlockDetails(null));
  }, [selectedBlock]);

  return (
    <Layout
      title="Blockchain Explorer (Advanced)"
      subtitle="Inspect raw blockchain blocks, hashes, transactions, and contract events."
      helpText="This page is technical and intended for project evaluation/demo."
    >
      <div className="grid gap-5 w-full max-w-full overflow-hidden">
        <BlockChainViewer
          blocks={blocksPayload.blocks}
          integrity={blocksPayload.integrity}
          onSelectBlock={setSelectedBlock}
          selectedBlock={selectedBlock}
        />

        <div className="grid gap-5 xl:grid-cols-2 w-full max-w-full overflow-hidden">
          <section className="panel p-4 md:p-6 w-full max-w-full overflow-hidden">
            <h2 className="text-xl font-black text-slate-100 mb-4">Block Inspector</h2>
            {!blockDetails ? (
              <div className="mt-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4 text-center">
                <p className="text-sm font-bold text-slate-400">Select a block to inspect.</p>
              </div>
            ) : (
              <div className="mt-3 space-y-3 w-full">
                <StatRow label="Block Number" value={blockDetails.number} />
                <StatRow label="Current Hash" value={blockDetails.hash} mono />
                <StatRow label="Previous Hash" value={blockDetails.previousHash} mono />
                <StatRow label="Timestamp" value={new Date(blockDetails.timestamp * 1000).toLocaleString()} />
                <StatRow label="Nonce" value={blockDetails.nonce} />
                <div className="pt-2">
                  <p className="mb-2 text-sm font-black text-slate-100">Transactions</p>
                  <div className="space-y-2 w-full">
                    {(blockDetails.transactions || []).map((tx) => (
                      <button
                        key={tx.hash}
                        type="button"
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 p-3 text-left shadow-sm hover:bg-slate-900/60 hover:border-indigo-300 transition-colors"
                        onClick={() => getTransactionDetails(tx.hash).then(setTxDetails).catch(() => setTxDetails(null))}
                      >
                        <p className="break-all font-mono text-[11px] font-bold text-slate-200">{tx.hash}</p>
                        <p className="text-[11px] font-bold text-slate-400 mt-1 truncate">from: {tx.from || "-"}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>

          <section className="panel p-4 md:p-6 w-full max-w-full overflow-hidden">
            <h2 className="text-xl font-black text-slate-100 mb-4">Transaction Inspector</h2>
            {!txDetails ? (
              <div className="mt-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4 text-center">
                <p className="text-sm font-bold text-slate-400">Click a transaction hash to inspect.</p>
              </div>
            ) : (
              <div className="mt-3 space-y-3 w-full">
                <StatRow label="Hash" value={txDetails.hash} mono />
                <StatRow label="From" value={txDetails.from} mono />
                <StatRow label="To" value={txDetails.to} mono />
                <StatRow label="Block Number" value={txDetails.blockNumber} />
                <StatRow label="Status" value={txDetails.status === 1 ? "Success" : "Failed"} />
                <StatRow label="Gas Limit" value={txDetails.gasLimit} />
                <StatRow label="Logs" value={JSON.stringify(txDetails.logs, null, 2)} mono />
              </div>
            )}
          </section>
        </div>

        <div className="grid gap-5 xl:grid-cols-2 w-full max-w-full overflow-hidden">
          <TransactionVolumeChart blocks={blocksPayload.blocks} />
          <ExecutionLog logs={events} />
        </div>
      </div>
    </Layout>
  );
}
