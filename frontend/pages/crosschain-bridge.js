import { useState, useEffect } from "react";
import Layout from "../components/Layout";

export default function CrossChainBridge() {
  const [propertyId, setPropertyId] = useState("");
  const [destinationChainId, setDestinationChainId] = useState("80002");
  const [status, setStatus] = useState("");
  const [txHash, setTxHash] = useState("");
  const [messageId, setMessageId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const pollStatus = async (hash) => {
    try {
      const res = await fetch(`http://localhost:4000/crosschain/status/${hash}`);
      if (!res.ok) return;
      const data = await res.json();
      
      // Map ANCHORED to RELAYED for display based on user requirements
      if (data.status === "ANCHORED") {
        setStatus("RELAYED");
      } else if (data.status === "VERIFIED") {
        setStatus("VERIFIED");
      } else if (data.status === "FAILED" || data.status === "MISMATCH") {
        setStatus("FAILED");
      } else {
        setStatus("INITIATED");
      }
      
      if (data.status !== "VERIFIED" && data.status !== "FAILED" && data.status !== "MISMATCH") {
        setTimeout(() => pollStatus(hash), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSend = async () => {
    setLoading(true);
    setError(null);
    setStatus("INITIATED");
    setTxHash("");
    setMessageId("");

    try {
      // First, mutate the property to trigger the crosschain handler
      const res = await fetch("http://localhost:4000/api/properties/mutate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: parseInt(propertyId),
          documentHash: "QmCrossChainBridgeTx",
          ownerPrivateKey: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to trigger source chain transaction");
      }

      const data = await res.json();
      const hash = data.txHash;
      setTxHash(hash);
      setMessageId(hash); // The backend uses ethTxHash as the identifier essentially

      // Poll for cross-chain status
      pollStatus(hash);
    } catch (err) {
      setError(err.message);
      setStatus("FAILED");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout
      title="Cross-Chain Bridge"
      subtitle="Securely relay property transactions across multiple blockchains."
      helpText="Enter the destination chain and property ID to initiate a cross-chain proof."
    >
      <div className="panel p-6 max-w-xl mx-auto mt-10">
        <h2 className="text-2xl font-bold text-white mb-6">Relay Transaction</h2>
        
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Destination Chain ID</label>
            <input
              type="text"
              value={destinationChainId}
              onChange={(e) => setDestinationChainId(e.target.value)}
              placeholder="e.g., 80002"
              className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Property ID</label>
            <input
              type="text"
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              placeholder="e.g., 1001"
              className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        <button
          onClick={handleSend}
          disabled={loading || !propertyId}
          className={`w-full py-3 rounded font-bold text-white transition-all ${
            loading || !propertyId ? "bg-slate-700 cursor-not-allowed" : "bg-cyan-600 hover:bg-cyan-500 shadow-lg shadow-cyan-500/30"
          }`}
        >
          {loading ? "Processing..." : "Send Cross-Chain"}
        </button>

        {txHash && (
          <div className="mt-8 p-4 bg-slate-900 rounded-lg border border-slate-800">
            <h3 className="text-lg font-semibold text-slate-200 mb-3">Transaction Status</h3>
            <div className="space-y-2 text-sm text-slate-400">
              <p><span className="text-slate-500">Message ID:</span> <span className="font-mono text-cyan-400">{messageId}</span></p>
              <p><span className="text-slate-500">Source Tx Hash:</span> <span className="font-mono text-cyan-400">{txHash}</span></p>
            </div>
            
            <div className="mt-6 relative">
              <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-800 -translate-y-1/2 z-0"></div>
              <div className="relative z-10 flex justify-between">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold mb-2 ${status === "INITIATED" || status === "RELAYED" || status === "VERIFIED" ? "bg-cyan-500 text-white" : "bg-slate-700 text-slate-500"}`}>1</div>
                  <span className={`text-xs font-semibold ${status === "INITIATED" || status === "RELAYED" || status === "VERIFIED" ? "text-cyan-400" : "text-slate-500"}`}>INITIATED</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold mb-2 ${status === "RELAYED" || status === "VERIFIED" ? "bg-cyan-500 text-white" : "bg-slate-700 text-slate-500"}`}>2</div>
                  <span className={`text-xs font-semibold ${status === "RELAYED" || status === "VERIFIED" ? "text-cyan-400" : "text-slate-500"}`}>RELAYED</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold mb-2 ${status === "VERIFIED" ? "bg-green-500 text-white" : "bg-slate-700 text-slate-500"}`}>3</div>
                  <span className={`text-xs font-semibold ${status === "VERIFIED" ? "text-green-400" : "text-slate-500"}`}>VERIFIED</span>
                </div>
              </div>
            </div>
            
            {status === "FAILED" && (
              <div className="mt-6 text-center text-red-400 font-semibold bg-red-900/20 py-2 rounded">
                Relay Failed
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
