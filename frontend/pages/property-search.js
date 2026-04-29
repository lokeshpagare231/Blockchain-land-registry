import { useState } from "react";
import Layout from "../components/Layout";
import { searchProperties } from "../lib/api";

function actionLabel(action) {
  if (!action) return "Record Updated";
  return action
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function PropertySearchPage() {
  const [query, setQuery] = useState({ propertyId: "", surveyNumber: "" });
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSearch(event) {
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

      const data = await searchProperties(payload);
      setResults(data.results || []);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout
      title="Property Search"
      subtitle="Verify ownership and full transaction history for any registered property."
      helpText="Search only by Property ID or Survey Number."
    >
      <section className="panel p-4 md:p-6">
        <h2 className="text-lg font-semibold text-slate-100">Find Property Record</h2>
        <form className="mt-4 grid gap-3 lg:grid-cols-3" onSubmit={handleSearch}>
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
            {loading ? "Searching..." : "Search"}
          </button>
        </form>
        {error ? <p className="mt-3 text-sm text-rose-400">{error}</p> : null}
      </section>

      <section className="mt-5 grid gap-4">
        {results.length === 0 ? (
          <article className="panel p-4 md:p-6">
            <p className="text-sm text-slate-400">No records found. Register a property first or adjust search values.</p>
          </article>
        ) : (
          results.map((property) => (
            <article key={property.propertyId} className="panel p-4 md:p-6">
              <div className="grid gap-3 lg:grid-cols-2">
                <div className="space-y-1 text-sm text-slate-300">
                  <p className="text-lg font-semibold text-slate-100">Property #{property.propertyId}</p>
                  <p>Survey Number: {property.surveyNumber}</p>
                  <p className="break-all">Current Owner Wallet: {property.ownerWalletAddress}</p>
                  <p className="break-all">Document Hash: {property.documentHash}</p>
                  <p>Last Updated: {new Date(property.updatedAt).toLocaleString()}</p>
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-100">Ownership Timeline</p>
                  <div className="mt-2 space-y-2">
                    {(property.history || []).length === 0 ? (
                      <p className="text-xs text-slate-400">No history available.</p>
                    ) : (
                      property.history.map((item, index) => (
                        <div key={`${property.propertyId}-${index}`} className="rounded-lg border border-slate-700 bg-slate-900/65 p-2 text-xs text-slate-300">
                          <p className="font-semibold text-slate-100">{actionLabel(item.action)}</p>
                          <p>Block: {item.blockNumber}</p>
                          <p className="break-all">Transaction: {item.transactionHash}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </article>
          ))
        )}
      </section>
    </Layout>
  );
}
