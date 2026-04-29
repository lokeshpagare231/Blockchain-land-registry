export default function BlockChainViewer({ blocks = [], integrity, onSelectBlock, selectedBlock }) {
  return (
    <section className="panel p-4 md:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-100">Ledger Blocks</h2>
        {integrity?.valid ? (
          <span className="badge-normal">Ledger integrity: Secure</span>
        ) : (
          <span className="badge-high">Chain integrity broken at block #{integrity?.brokenAt}</span>
        )}
      </div>

      {blocks.length === 0 ? (
        <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-3">
          <p className="text-sm text-slate-400">No blocks available yet. Run a property transaction to create records.</p>
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {blocks.map((block) => (
            <button
              type="button"
              key={block.number}
              onClick={() => onSelectBlock?.(block.number)}
              className={`min-w-[260px] rounded-xl border bg-slate-900/60 p-3 text-left transition ${
                selectedBlock === block.number
                  ? "border-cyan-400/60 ring-1 ring-cyan-400/40"
                  : "border-slate-700 hover:border-slate-500"
              }`}
            >
              <p className="text-xs uppercase tracking-wide text-slate-400">Block #{block.number}</p>
              <p className="mt-2 truncate font-mono text-[11px] text-slate-300">Prev: {block.previousHash}</p>
              <p className="truncate font-mono text-[11px] text-slate-300">Hash: {block.hash}</p>
              <p className="mt-2 text-xs text-slate-400">Transactions: {block.transactionHashes?.length || 0}</p>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
