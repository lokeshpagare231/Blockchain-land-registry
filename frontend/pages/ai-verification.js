import { useState } from "react";
import Layout from "../components/Layout";
import { uploadDocument } from "../lib/api";

export default function AiVerificationPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function onUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const data = await uploadDocument(formData);
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }

  const fraudPercent = Math.min(100, Number(result?.ai?.fraudRiskScore || 0) * 100);
  const duplicatePercent = Math.min(100, Number(result?.ai?.duplicateProbability || 0) * 100);

  return (
    <Layout
      title="AI Verification"
      subtitle="Check document validity before property registration or transfer."
      helpText="Upload one document at a time. The system runs OCR, duplicate detection, and fraud-risk scoring."
    >
      <div className="grid gap-5 xl:grid-cols-2">
        <section className="panel p-4 md:p-6">
          <h2 className="text-lg font-semibold text-slate-100">Upload Document</h2>
          <input type="file" className="mt-4" onChange={onUpload} />

          {loading ? <p className="mt-3 text-sm text-slate-300">Running OCR and threat analysis...</p> : null}
          {error ? <p className="mt-3 text-sm text-rose-400">{error}</p> : null}

          {result ? (
            <div className="mt-4 rounded-xl border border-slate-700 bg-slate-900/70 p-3 text-sm text-slate-300">
              <p className="break-all">Document Hash: {result.documentHash}</p>
              <p>Storage: {result.ipfs.storageType}</p>
              <p>Validity: {result.ai.validity}</p>
              <p>Fraud Risk Score: {result.ai.fraudRiskScore}</p>
              <p>Duplicate Probability: {result.ai.duplicateProbability}</p>
            </div>
          ) : null}
        </section>

        <section className="panel p-4 md:p-6">
          <h2 className="text-lg font-semibold text-slate-100">Verification Summary</h2>
          {!result ? (
            <p className="mt-2 text-sm text-slate-400">Upload a file to view AI verification results.</p>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-slate-300">Document Validity</p>
                <span className={result.ai.validity === "VALID" ? "badge-normal" : "badge-high"}>{result.ai.validity}</span>
              </div>
              <div>
                <p className="text-sm text-slate-300">Fraud Risk</p>
                <div className="mt-1 h-3 w-full rounded-full bg-slate-700">
                  <div className="h-3 rounded-full bg-rose-400" style={{ width: `${fraudPercent}%` }} />
                </div>
              </div>
              <div>
                <p className="text-sm text-slate-300">Duplicate Probability</p>
                <div className="mt-1 h-3 w-full rounded-full bg-slate-700">
                  <div className="h-3 rounded-full bg-amber-400" style={{ width: `${duplicatePercent}%` }} />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-200">Suspicious Patterns</p>
                <ul className="mt-1 space-y-1 text-xs text-slate-400">
                  {(result.ai.suspiciousPatterns || []).length === 0 ? (
                    <li>No suspicious patterns detected.</li>
                  ) : (
                    result.ai.suspiciousPatterns.map((item) => <li key={item}>- {item}</li>)
                  )}
                </ul>
              </div>
            </div>
          )}
        </section>
      </div>

      <section className="panel mt-5 p-4 md:p-6">
        <h2 className="text-lg font-semibold text-slate-100">OCR Extracted Text</h2>
        <pre className="mt-3 max-h-[300px] overflow-auto rounded-xl border border-slate-700 bg-slate-900/70 p-3 text-xs whitespace-pre-wrap text-slate-300">
          {result?.ai?.extractedText || "No text extracted yet."}
        </pre>
      </section>
    </Layout>
  );
}
