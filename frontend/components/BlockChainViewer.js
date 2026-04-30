export default function BlockChainViewer({ blocks = [], integrity, onSelectBlock, selectedBlock }) {
  return (
    <section className="panel p-4 md:p-6 w-full max-w-full overflow-hidden">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-black text-slate-100">Ledger Blocks</h2>
        {integrity?.valid ? (
          <span className="badge-normal">Ledger integrity: Secure</span>
        ) : (
          <span className="badge-high">Chain integrity broken at block #{integrity?.brokenAt}</span>
        )}
      </div>

      {blocks.length === 0 ? (
        <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-3">
          <p className="text-sm font-bold text-slate-400">No blocks available yet. Run a property transaction to create records.</p>
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar w-full">
          {blocks.map((block) => (
            <button
              type="button"
              key={block.number}
              onClick={() => onSelectBlock?.(block.number)}
              className={`min-w-[260px] max-w-[260px] rounded-xl border bg-slate-900/60 p-3 text-left transition shadow-sm flex-shrink-0 ${
                selectedBlock === block.number
                  ? "border-indigo-500 ring-1 ring-indigo-500 bg-indigo-50/30"
                  : "border-slate-700 hover:border-indigo-300 hover:bg-slate-900/60"
              }`}
            >
              <p className="text-xs uppercase tracking-wider font-extrabold text-slate-400">Block #{block.number}</p>
              <p className="mt-2 truncate font-mono text-[11px] font-bold text-slate-300">Prev: {block.previousHash}</p>
              <p className="truncate font-mono text-[11px] font-bold text-slate-300">Hash: {block.hash}</p>
              <p className="mt-2 text-xs font-bold text-slate-400">Transactions: {block.transactionHashes?.length || 0}</p>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
