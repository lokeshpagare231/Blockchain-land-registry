export default function ExecutionLog({ logs = [] }) {
  return (
    <section className="panel p-4 md:p-6 w-full max-w-full overflow-hidden">
      <h2 className="mb-4 text-lg font-black text-slate-100">Smart Contract Execution Log</h2>
      <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1 custom-scrollbar w-full overflow-x-hidden">
        {logs.length === 0 ? (
          <p className="text-sm font-bold text-slate-400">No events yet.</p>
        ) : (
          logs.map((log, index) => (
            <div key={`${log.txHash}-${index}`} className="rounded-lg border border-slate-700 bg-slate-900/65 p-3 shadow-sm break-all">
              <p className="text-xs font-black text-emerald-300">{log.type}</p>
              <p className="mt-1 font-mono text-[11px] font-bold text-slate-300">tx: {log.txHash}</p>
              <p className="text-[11px] font-bold text-slate-400 mt-1">block: {log.blockNumber}</p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
