function short(value) {
  if (!value) return "pending";
  return `${value.slice(0, 18)}...${value.slice(-10)}`;
}

export default function HashGeneratorDisplay({ blockMeta }) {
  return (
    <section className="panel p-4 md:p-6">
      <h2 className="mb-3 text-lg font-semibold text-slate-100">Hash Details (Advanced)</h2>
      <p className="mb-3 text-xs text-slate-400">Formula: SHA256(blockData + previousHash)</p>
      <div className="space-y-2 rounded-xl border border-slate-700 bg-slate-900/65 p-3 font-mono text-[11px] text-slate-300">
        <p>BlockNumber: {blockMeta?.blockNumber ?? "-"}</p>
        <p>PreviousHash: {short(blockMeta?.previousHash)}</p>
        <p>MerkleRoot: {short(blockMeta?.merkleRoot)}</p>
        <p>Nonce: {blockMeta?.nonce ?? "-"}</p>
        <p>CurrentHash: {short(blockMeta?.currentHash)}</p>
      </div>
    </section>
  );
}
