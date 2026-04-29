import { useState } from "react";
import Layout from "../components/Layout";
import TransactionTimeline from "../components/TransactionTimeline";
import HashGeneratorDisplay from "../components/HashGeneratorDisplay";
import MerkleTreeViewer from "../components/MerkleTreeViewer";
import { uploadDocument, registerProperty } from "../lib/api";

const defaultRegistration = {
  propertyId: "",
  surveyNumber: "",
  geoCoordinates: "",
  ownerWalletAddress: "",
  documentHash: ""
};

export default function PropertyRegistryPage() {
  const [registration, setRegistration] = useState(defaultRegistration);
  const [uploadState, setUploadState] = useState({ loading: false, result: null, error: "" });
  const [txState, setTxState] = useState({ loading: false, result: null, error: "" });
  const [showAdvanced, setShowAdvanced] = useState(false);

  async function handleUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadState({ loading: true, result: null, error: "" });

    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await uploadDocument(formData);
      setUploadState({ loading: false, result, error: "" });
      setRegistration((prev) => ({ ...prev, documentHash: result.documentHash }));
    } catch (error) {
      setUploadState({ loading: false, result: null, error: error.response?.data?.error || error.message });
    }
  }

  async function onRegister(event) {
    event.preventDefault();
    setTxState({ loading: true, result: null, error: "" });

    try {
      const payload = {
        ...registration,
        propertyId: Number(registration.propertyId)
      };
      const result = await registerProperty(payload);
      setTxState({ loading: false, result, error: "" });
      setRegistration(defaultRegistration);
    } catch (error) {
      setTxState({ loading: false, result: null, error: error.response?.data?.error || error.message });
    }
  }

  return (
    <Layout
      title="Register Property"
      subtitle="Create a new property record. The system will verify documents and securely write the final record to blockchain."
      helpText="Recommended flow: 1) Upload document, 2) Confirm AI score, 3) Submit registration."
    >
      <div className="grid gap-5 xl:grid-cols-[1.1fr_1.4fr]">
        <section className="panel p-4 md:p-6">
          <h2 className="text-lg font-semibold text-slate-100">Step 1: Upload Document</h2>
          <p className="mt-1 text-sm text-slate-300">Upload a sale deed or ownership document for AI verification and IPFS storage.</p>

          <input type="file" className="mt-4" onChange={handleUpload} />

          {uploadState.loading ? <p className="mt-2 text-sm text-slate-300">Uploading and verifying document...</p> : null}
          {uploadState.error ? <p className="mt-2 text-sm text-rose-400">{uploadState.error}</p> : null}

          {uploadState.result ? (
            <div className="mt-3 rounded-xl border border-slate-700 bg-slate-900/70 p-3 text-sm text-slate-300">
              <p className="break-all">Document Hash: {uploadState.result.documentHash}</p>
              <p className="mt-1">Validity: {uploadState.result.ai.validity}</p>
              <p>Fraud Risk Score: {uploadState.result.ai.fraudRiskScore}</p>
              <p>Duplicate Probability: {uploadState.result.ai.duplicateProbability}</p>
            </div>
          ) : null}
        </section>

        <section className="panel p-4 md:p-6">
          <h2 className="text-lg font-semibold text-slate-100">Step 2: Enter Property Details</h2>
          <form className="mt-3 grid gap-3" onSubmit={onRegister}>
            <div>
              <label className="text-xs text-slate-400">Property ID</label>
              <input
                placeholder="Example: 1001"
                value={registration.propertyId}
                onChange={(e) => setRegistration((prev) => ({ ...prev, propertyId: e.target.value }))}
                required
              />
            </div>

            <div>
              <label className="text-xs text-slate-400">Survey Number</label>
              <input
                placeholder="Example: MH-PUNE-9832"
                value={registration.surveyNumber}
                onChange={(e) => setRegistration((prev) => ({ ...prev, surveyNumber: e.target.value }))}
                required
              />
            </div>

            <div>
              <label className="text-xs text-slate-400">Geo Coordinates</label>
              <input
                placeholder="Example: 18.5204,73.8567"
                value={registration.geoCoordinates}
                onChange={(e) => setRegistration((prev) => ({ ...prev, geoCoordinates: e.target.value }))}
                required
              />
            </div>

            <div>
              <label className="text-xs text-slate-400">Owner Wallet Address</label>
              <input
                placeholder="Example: 0x3A9F..."
                value={registration.ownerWalletAddress}
                onChange={(e) => setRegistration((prev) => ({ ...prev, ownerWalletAddress: e.target.value }))}
                required
              />
              <p className="mt-1 text-[11px] text-slate-500">Use the wallet address of the person who will become the current owner.</p>
            </div>

            <div>
              <label className="text-xs text-slate-400">Document Hash</label>
              <input
                placeholder="Auto-filled after document upload"
                value={registration.documentHash}
                onChange={(e) => setRegistration((prev) => ({ ...prev, documentHash: e.target.value }))}
                required
              />
            </div>

            <button className="btn-primary mt-2" type="submit" disabled={txState.loading}>
              {txState.loading ? "Submitting..." : "Register Property"}
            </button>
          </form>

          {txState.error ? <p className="mt-3 text-sm text-rose-400">{txState.error}</p> : null}
          {txState.result ? (
            <div className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-500/15 p-3 text-sm text-emerald-200">
              Your property registration has been securely recorded in the national digital ledger.
            </div>
          ) : null}
        </section>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <TransactionTimeline
          steps={txState.result?.steps || []}
          friendly
          title="What happened in the background"
        />

        <section className="panel p-4 md:p-6">
          <h2 className="text-lg font-semibold text-slate-100">Need technical details?</h2>
          <p className="mt-2 text-sm text-slate-300">Switch on advanced mode to inspect hash generation and Merkle structure.</p>
          <button type="button" className="btn-secondary mt-3" onClick={() => setShowAdvanced((v) => !v)}>
            {showAdvanced ? "Hide Advanced Details" : "Show Advanced Details"}
          </button>
        </section>
      </div>

      {showAdvanced ? (
        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          <HashGeneratorDisplay blockMeta={txState.result?.blockMeta} />
          <MerkleTreeViewer
            txHashes={txState.result?.blockMeta?.transactionData || []}
            merkleRoot={txState.result?.blockMeta?.merkleRoot}
          />
        </div>
      ) : null}
    </Layout>
  );
}
