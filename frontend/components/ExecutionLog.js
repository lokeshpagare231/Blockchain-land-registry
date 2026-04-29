export default function ExecutionLog({ logs = [] }) {
  return (
    <section className="panel p-4 md:p-6">
      <h2 className="mb-4 text-lg font-semibold text-slate-100">Smart Contract Execution Log</h2>
      <div className="max-h-[320px] space-y-2 overflow-auto pr-1">
        {logs.length === 0 ? (
          <p className="text-sm text-slate-400">No events yet.</p>
        ) : (
          logs.map((log, index) => (
            <div key={`${log.txHash}-${index}`} className="rounded-lg border border-slate-700 bg-slate-900/65 p-3">
              <p className="text-xs font-semibold text-emerald-300">{log.type}</p>
              <p className="mt-1 break-all font-mono text-[11px] text-slate-300">tx: {log.txHash}</p>
              <p className="text-[11px] text-slate-400">block: {log.blockNumber}</p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
