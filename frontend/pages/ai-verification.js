import { useState } from "react";
import Layout from "../components/Layout";

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
      // Simulate reading .txt file
      const text = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(new Error("Failed to read file"));
        reader.readAsText(file);
      });

      // Deterministic hash to keep values same for same document
      let hash = 0;
      for (let i = 0; i < text.length; i++) {
        hash = ((hash << 5) - hash) + text.charCodeAt(i);
        hash |= 0; // Convert to 32bit integer
      }
      const randomBase = Math.abs(hash) / 2147483647; // 0 to 1

      const fraudRisk = (randomBase * 0.8).toFixed(2); // keep it between 0 and 0.8
      const duplicateProb = ((1 - randomBase) * 0.9).toFixed(2);

      const isSuspicious = fraudRisk > 0.6;

      setTimeout(() => {
        setResult({
          documentHash: "QmSimulated" + Math.abs(hash).toString(16),
          ipfs: { storageType: "Simulated IPFS Storage" },
          ai: {
            validity: isSuspicious ? "SUSPICIOUS" : "VALID",
            fraudRiskScore: fraudRisk,
            duplicateProbability: duplicateProb,
            suspiciousPatterns: isSuspicious ? ["High anomaly score in content structure.", "Matches known suspicious patterns."] : [],
            extractedText: text
          }
        });
        setLoading(false);
      }, 1500); // 1.5s simulated delay
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  const fraudPercent = Math.min(100, Number(result?.ai?.fraudRiskScore || 0) * 100);
  const duplicatePercent = Math.min(100, Number(result?.ai?.duplicateProbability || 0) * 100);

  return (
    <Layout
      title="AI Document Verification"
      subtitle="Check document validity before property registration or transfer."
      helpText="Upload a .txt document to securely verify and run fraud-risk scoring locally."
    >
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="panel p-6">
          <h2 className="text-xl font-bold text-slate-100 mb-4">Upload Document</h2>
          
          <div className="mt-2 flex justify-center rounded-[16px] border border-dashed border-slate-600 bg-slate-900/60 px-6 py-10 hover:border-indigo-500/50 transition-colors">
            <div className="text-center">
              <span className="text-4xl text-slate-400 block mb-3">📄</span>
              <div className="mt-4 flex text-sm leading-6 text-slate-400 justify-center">
                <label
                  htmlFor="file-upload"
                  className="relative cursor-pointer rounded-md font-semibold text-indigo-400 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 hover:text-indigo-300"
                >
                  <span>Upload a file</span>
                  <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={onUpload} accept=".txt" />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs leading-5 text-slate-500 mt-2">TXT up to 10MB</p>
            </div>
          </div>

          {loading ? <p className="mt-4 text-sm font-semibold text-indigo-400 flex items-center gap-2"><span className="animate-spin text-xl">⏳</span> Running simulated OCR and threat analysis...</p> : null}
          {error ? <p className="mt-4 text-sm font-semibold text-rose-400">{error}</p> : null}

          {result ? (
            <div className="mt-6 rounded-[16px] border border-slate-700 bg-slate-900/60 p-4 text-sm text-slate-200 shadow-sm">
              <p className="font-mono text-xs break-all text-slate-400 mb-2">Hash: {result.documentHash}</p>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div><span className="text-xs text-slate-500 block">Storage</span><span className="font-medium text-slate-200">{result.ipfs.storageType}</span></div>
                <div><span className="text-xs text-slate-500 block">Validity</span><span className="font-medium text-slate-200">{result.ai.validity}</span></div>
                <div><span className="text-xs text-slate-500 block">Fraud Score</span><span className="font-medium text-slate-200">{result.ai.fraudRiskScore}</span></div>
                <div><span className="text-xs text-slate-500 block">Duplicate Prob</span><span className="font-medium text-slate-200">{result.ai.duplicateProbability}</span></div>
              </div>
            </div>
          ) : null}
        </section>

        <section className="panel p-6">
          <h2 className="text-xl font-bold text-slate-100 mb-4">Verification Summary</h2>
          {!result ? (
            <div className="flex flex-col items-center justify-center h-[250px] text-center border border-dashed border-slate-700 rounded-[16px] bg-slate-900/40">
               <span className="text-3xl text-slate-600 mb-2">📊</span>
               <p className="text-sm font-medium text-slate-400">Upload a document to view AI results.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                <p className="text-sm font-bold text-slate-300">Document Validity</p>
                <span className={result.ai.validity === "VALID" ? "badge-normal" : "badge-high"}>{result.ai.validity}</span>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <p className="text-sm font-bold text-slate-300">Fraud Risk</p>
                  <span className="text-xs font-bold text-slate-400">{fraudPercent.toFixed(0)}%</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div className={`h-full rounded-full ${fraudPercent > 60 ? 'bg-rose-500' : 'bg-indigo-500'} transition-all duration-1000`} style={{ width: `${fraudPercent}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <p className="text-sm font-bold text-slate-300">Duplicate Probability</p>
                  <span className="text-xs font-bold text-slate-400">{duplicatePercent.toFixed(0)}%</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div className={`h-full rounded-full ${duplicatePercent > 50 ? 'bg-amber-500' : 'bg-emerald-400'} transition-all duration-1000`} style={{ width: `${duplicatePercent}%` }} />
                </div>
              </div>
              <div className="pt-2">
                <p className="text-sm font-bold text-slate-100 mb-2">Suspicious Patterns</p>
                <ul className="space-y-2 text-xs font-medium text-slate-300">
                  {(result.ai.suspiciousPatterns || []).length === 0 ? (
                    <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> No suspicious patterns detected.</li>
                  ) : (
                    result.ai.suspiciousPatterns.map((item) => <li key={item} className="flex items-center gap-2"><span className="text-rose-400">⚠</span> {item}</li>)
                  )}
                </ul>
              </div>
            </div>
          )}
        </section>
      </div>

      <section className="panel mt-6 p-6">
        <h2 className="text-xl font-bold text-slate-100 mb-4">Extracted Text Content</h2>
        <pre className="max-h-[300px] overflow-auto rounded-[16px] border border-slate-700 bg-slate-900/60 p-4 text-xs font-mono whitespace-pre-wrap text-slate-300 shadow-inner">
          {result?.ai?.extractedText || "No text extracted yet."}
        </pre>
      </section>
    </Layout>
  );
}
