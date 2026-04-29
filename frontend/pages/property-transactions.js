import { useMemo, useState } from "react";
import Layout from "../components/Layout";
import TransactionTimeline from "../components/TransactionTimeline";
import HashGeneratorDisplay from "../components/HashGeneratorDisplay";
import MerkleTreeViewer from "../components/MerkleTreeViewer";
import { uploadDocument, transferProperty, inheritProperty, mutateProperty } from "../lib/api";

const defaultTransfer = {
  propertyId: "",
  newOwnerWalletAddress: "",
  documentHash: "",
  currentOwnerPrivateKey: ""
};

const defaultInherit = {
  propertyId: "",
  beneficiaryWalletAddress: "",
  documentHash: ""
};

const defaultMutation = {
  propertyId: "",
  documentHash: "",
  ownerPrivateKey: ""
};

export default function PropertyTransactionsPage() {
  const [mode, setMode] = useState("TRANSFER");
  const [transfer, setTransfer] = useState(defaultTransfer);
  const [inheritance, setInheritance] = useState(defaultInherit);
  const [mutation, setMutation] = useState(defaultMutation);
  const [uploadState, setUploadState] = useState({ loading: false, result: null, error: "" });
  const [txState, setTxState] = useState({ loading: false, result: null, error: "" });
  const [showAdvanced, setShowAdvanced] = useState(false);

  const buttonMap = useMemo(
    () => ({
      TRANSFER: "Transfer Ownership",
      INHERIT: "Record Inheritance",
      MUTATE: "Update Property Record"
    }),
    []
  );

  async function handleUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadState({ loading: true, result: null, error: "" });

    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await uploadDocument(formData);
      setUploadState({ loading: false, result, error: "" });

      setTransfer((prev) => ({ ...prev, documentHash: result.documentHash }));
      setInheritance((prev) => ({ ...prev, documentHash: result.documentHash }));
      setMutation((prev) => ({ ...prev, documentHash: result.documentHash }));
    } catch (error) {
      setUploadState({ loading: false, result: null, error: error.response?.data?.error || error.message });
    }
  }

  async function submitTransaction(event) {
    event.preventDefault();
    setTxState({ loading: true, result: null, error: "" });

    try {
      let result;
      if (mode === "TRANSFER") {
        result = await transferProperty({ ...transfer, propertyId: Number(transfer.propertyId) });
        setTransfer(defaultTransfer);
      } else if (mode === "INHERIT") {
        result = await inheritProperty({ ...inheritance, propertyId: Number(inheritance.propertyId) });
        setInheritance(defaultInherit);
      } else {
        result = await mutateProperty({ ...mutation, propertyId: Number(mutation.propertyId) });
        setMutation(defaultMutation);
      }

      setTxState({ loading: false, result, error: "" });
    } catch (error) {
      setTxState({ loading: false, result: null, error: error.response?.data?.error || error.message });
    }
  }

  return (
    <Layout
      title="Property Transactions"
      subtitle="Transfer, inherit, or update property ownership using guided workflows."
      helpText="You do not need blockchain knowledge. Submit a transaction and the platform handles secure ledger recording automatically."
    >
      <div className="grid gap-5 xl:grid-cols-[1.05fr_1.4fr]">
        <section className="panel p-4 md:p-6">
          <h2 className="text-lg font-semibold text-slate-100">Step 1: Upload Supporting Document</h2>
          <p className="mt-1 text-sm text-slate-300">Upload a sale deed, inheritance document, or correction file before approval.</p>

          <input type="file" className="mt-4" onChange={handleUpload} />
          {uploadState.loading ? <p className="mt-2 text-sm text-slate-300">Uploading and running AI checks...</p> : null}
          {uploadState.error ? <p className="mt-2 text-sm text-rose-400">{uploadState.error}</p> : null}
          {uploadState.result ? (
            <div className="mt-3 rounded-xl border border-slate-700 bg-slate-900/70 p-3 text-sm text-slate-300">
              <p className="break-all">Document Hash: {uploadState.result.documentHash}</p>
              <p className="mt-1">Validity: {uploadState.result.ai.validity}</p>
              <p>Fraud Risk Score: {uploadState.result.ai.fraudRiskScore}</p>
            </div>
          ) : null}
        </section>

        <section className="panel p-4 md:p-6">
          <h2 className="text-lg font-semibold text-slate-100">Step 2: Choose Transaction Type</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.keys(buttonMap).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setMode(key)}
                className={key === mode ? "btn-primary" : "btn-secondary"}
              >
                {buttonMap[key]}
              </button>
            ))}
          </div>

          <form className="mt-4 grid gap-3" onSubmit={submitTransaction}>
            {mode === "TRANSFER" ? (
              <>
                <input
                  placeholder="Property ID"
                  value={transfer.propertyId}
                  onChange={(e) => setTransfer((prev) => ({ ...prev, propertyId: e.target.value }))}
                  required
                />
                <input
                  placeholder="New Owner Wallet Address"
                  value={transfer.newOwnerWalletAddress}
                  onChange={(e) => setTransfer((prev) => ({ ...prev, newOwnerWalletAddress: e.target.value }))}
                  required
                />
                <input
                  placeholder="Current Owner Private Key"
                  value={transfer.currentOwnerPrivateKey}
                  onChange={(e) => setTransfer((prev) => ({ ...prev, currentOwnerPrivateKey: e.target.value }))}
                  required
                />
                <input
                  placeholder="Document Hash"
                  value={transfer.documentHash}
                  onChange={(e) => setTransfer((prev) => ({ ...prev, documentHash: e.target.value }))}
                  required
                />
              </>
            ) : null}

            {mode === "INHERIT" ? (
              <>
                <input
                  placeholder="Property ID"
                  value={inheritance.propertyId}
                  onChange={(e) => setInheritance((prev) => ({ ...prev, propertyId: e.target.value }))}
                  required
                />
                <input
                  placeholder="Beneficiary Wallet Address"
                  value={inheritance.beneficiaryWalletAddress}
                  onChange={(e) => setInheritance((prev) => ({ ...prev, beneficiaryWalletAddress: e.target.value }))}
                  required
                />
                <input
                  placeholder="Document Hash"
                  value={inheritance.documentHash}
                  onChange={(e) => setInheritance((prev) => ({ ...prev, documentHash: e.target.value }))}
                  required
                />
              </>
            ) : null}

            {mode === "MUTATE" ? (
              <>
                <input
                  placeholder="Property ID"
                  value={mutation.propertyId}
                  onChange={(e) => setMutation((prev) => ({ ...prev, propertyId: e.target.value }))}
                  required
                />
                <input
                  placeholder="Owner Private Key"
                  value={mutation.ownerPrivateKey}
                  onChange={(e) => setMutation((prev) => ({ ...prev, ownerPrivateKey: e.target.value }))}
                  required
                />
                <input
                  placeholder="Document Hash"
                  value={mutation.documentHash}
                  onChange={(e) => setMutation((prev) => ({ ...prev, documentHash: e.target.value }))}
                  required
                />
              </>
            ) : null}

            <button className="btn-primary mt-1" type="submit" disabled={txState.loading}>
              {txState.loading ? "Submitting..." : buttonMap[mode]}
            </button>
          </form>

          {txState.error ? <p className="mt-3 text-sm text-rose-400">{txState.error}</p> : null}
          {txState.result ? (
            <div className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-500/15 p-3 text-sm text-emerald-200">
              Transaction completed. Ownership details have been securely recorded in the ledger.
            </div>
          ) : null}
        </section>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <TransactionTimeline steps={txState.result?.steps || []} friendly title="Transaction Progress" />
        <section className="panel p-4 md:p-6">
          <h2 className="text-lg font-semibold text-slate-100">Advanced Details</h2>
          <p className="mt-2 text-sm text-slate-300">Enable this only if you want to inspect Merkle roots and block hashes.</p>
          <button type="button" className="btn-secondary mt-3" onClick={() => setShowAdvanced((v) => !v)}>
            {showAdvanced ? "Hide Advanced" : "Show Advanced"}
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
