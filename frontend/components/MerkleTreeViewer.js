function truncate(value) {
  if (!value) return "-";
  return `${value.slice(0, 12)}...${value.slice(-6)}`;
}

function buildLevels(leaves) {
  if (!leaves.length) return [];
  const levels = [leaves];

  let current = leaves;
  while (current.length > 1) {
    const next = [];
    for (let i = 0; i < current.length; i += 2) {
      const left = current[i];
      const right = current[i + 1] || left;
      next.push(`${left.slice(0, 10)}${right.slice(-10)}`);
    }
    levels.push(next);
    current = next;
  }

  return levels.reverse();
}

export default function MerkleTreeViewer({ txHashes = [], merkleRoot }) {
  const levels = buildLevels(txHashes);

  return (
    <section className="panel p-4 md:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-100">Merkle Tree (Advanced)</h2>
        <span className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-1 font-mono text-[11px] text-slate-300">
          Root: {truncate(merkleRoot || "pending")}
        </span>
      </div>

      {levels.length === 0 ? (
        <p className="text-sm text-slate-400">No transactions yet. Trigger a blockchain transaction to build a Merkle tree.</p>
      ) : (
        <div className="space-y-3">
          {levels.map((level, index) => (
            <div key={`level-${index}`} className="flex flex-wrap gap-2">
              {level.map((hash, nodeIndex) => (
                <div
                  key={`${index}-${nodeIndex}`}
                  className="rounded-lg border border-slate-700 bg-slate-900/65 px-2 py-1 font-mono text-[11px] text-slate-300"
                >
                  {truncate(hash)}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
