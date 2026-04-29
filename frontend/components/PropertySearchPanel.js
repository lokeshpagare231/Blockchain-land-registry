import { useState } from "react";
import { searchProperties } from "../lib/api";

function formatHistoryAction(action) {
  if (!action) return "Record updated";
  return action
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function PropertySearchPanel() {
  const [query, setQuery] = useState({ propertyId: "", surveyNumber: "" });
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSearch(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const propertyId = query.propertyId.trim();
    const surveyNumber = query.surveyNumber.trim();

    if (!propertyId && !surveyNumber) {
      setError("Enter Property ID or Survey Number to search.");
      setLoading(false);
      return;
    }

    try {
      const payload = {};
      if (propertyId) payload.propertyId = propertyId;
      if (surveyNumber) payload.surveyNumber = surveyNumber;

      const response = await searchProperties(payload);
      setResults(response.results || []);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel p-4 md:p-6">
      <h2 className="mb-2 text-lg font-semibold text-slate-100">Property Search</h2>
      <p className="text-xs text-slate-400">Find a property record by Property ID or Survey Number.</p>

      <form className="mt-4 grid gap-3 lg:grid-cols-3" onSubmit={onSearch}>
        <input
          placeholder="Property ID"
          value={query.propertyId}
          onChange={(e) => setQuery((prev) => ({ ...prev, propertyId: e.target.value }))}
        />
        <input
          placeholder="Survey Number"
          value={query.surveyNumber}
          onChange={(e) => setQuery((prev) => ({ ...prev, surveyNumber: e.target.value }))}
        />
        <button type="submit" className="btn-primary">
          {loading ? "Searching..." : "Search Property"}
        </button>
      </form>

      {error ? <p className="mt-3 text-sm text-rose-400">{error}</p> : null}

      <div className="mt-4 space-y-3">
        {results.length === 0 ? (
          <p className="text-sm text-slate-400">No records yet. Try searching after registering a property.</p>
        ) : (
          results.map((property) => (
            <div key={property.propertyId} className="rounded-xl border border-slate-700 bg-slate-900/65 p-4">
              <p className="font-semibold text-slate-100">Property #{property.propertyId}</p>
              <p className="mt-1 text-sm text-slate-300">Survey: {property.surveyNumber}</p>
              <p className="text-sm text-slate-300">Current Owner: {property.ownerWalletAddress}</p>
              <p className="break-all text-xs text-slate-400">Document Hash: {property.documentHash}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(property.history || []).map((item, idx) => (
                  <span key={`${property.propertyId}-${idx}`} className="rounded-full bg-slate-800 px-2 py-1 text-[11px] text-slate-300">
                    {formatHistoryAction(item.action)} @ block {item.blockNumber}
                  </span>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
