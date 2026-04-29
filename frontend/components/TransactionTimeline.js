const friendlyMap = [
  {
    match: ["Transaction Created"],
    text: "Your request has been created and queued for secure processing."
  },
  {
    match: ["Transaction Broadcast", "Broadcast"],
    text: "The request is shared with validator systems for confirmation."
  },
  {
    match: ["Validate", "Nodes Validate"],
    text: "Independent validators are checking whether this request is valid."
  },
  {
    match: ["Block Created", "grouped into block"],
    text: "The verified request is grouped into a permanent digital record."
  },
  {
    match: ["Merkle", "Hash Generated"],
    text: "A unique digital fingerprint is generated to prevent tampering."
  },
  {
    match: ["Block Linked", "Added to Chain", "Block Added"],
    text: "Your property transaction has been securely recorded in the national digital ledger."
  },
  {
    match: ["Ownership Updated", "ownership"],
    text: "Property ownership has been updated successfully."
  }
];

function resolveFriendlyText(step) {
  const title = (step.title || "").toLowerCase();
  for (const row of friendlyMap) {
    if (row.match.some((key) => title.includes(key.toLowerCase()))) {
      return row.text;
    }
  }
  return step.detail || "Transaction step in progress.";
}

export default function TransactionTimeline({ steps = [], friendly = false, title = "Transaction Timeline" }) {
  return (
    <section className="panel p-4 md:p-6">
      <h2 className="mb-4 text-lg font-semibold text-slate-100">{title}</h2>
      {steps.length === 0 ? (
        <p className="text-sm text-slate-400">No timeline yet. Start a transaction to see progress.</p>
      ) : (
        <ol className="space-y-3">
          {steps.map((step) => (
            <li key={step.id} className="animate-fade-up rounded-xl border border-slate-700 bg-slate-900/65 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-slate-100">{friendly ? `Step ${step.id}` : step.title}</p>
                <span
                  className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                    step.status === "done"
                      ? "bg-emerald-500/20 text-emerald-300"
                      : step.status === "pending"
                      ? "bg-amber-500/20 text-amber-300"
                      : "bg-slate-700 text-slate-300"
                  }`}
                >
                  {step.status}
                </span>
              </div>
              {!friendly ? <p className="mt-1 text-sm text-slate-300">{step.title}</p> : null}
              <p className="mt-1 text-xs text-slate-400">{friendly ? resolveFriendlyText(step) : step.detail}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
