import { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import TransactionTimeline from "../components/TransactionTimeline";
import NodeNetworkVisualization from "../components/NodeNetworkVisualization";
import MerkleTreeViewer from "../components/MerkleTreeViewer";
import HashGeneratorDisplay from "../components/HashGeneratorDisplay";
import ExecutionLog from "../components/ExecutionLog";
import {
  fetchNetworkStatus,
  registerProperty,
  transferProperty,
  inheritProperty,
  mutateProperty
} from "../lib/api";
import { getSocket } from "../lib/socket";

const initialPayloads = {
  REGISTER: {
    propertyId: "2001",
    surveyNumber: "SURVEY-2001",
    geoCoordinates: "19.0760,72.8777",
    ownerWalletAddress: "",
    documentHash: "QmSimulatorRegisterDoc"
  },
  TRANSFER: {
    propertyId: "2001",
    newOwnerWalletAddress: "",
    documentHash: "QmSimulatorSaleDoc",
    currentOwnerPrivateKey: ""
  },
  INHERIT: {
    propertyId: "2001",
    beneficiaryWalletAddress: "",
    documentHash: "QmSimulatorInheritDoc"
  },
  MUTATE: {
    propertyId: "2001",
    documentHash: "QmSimulatorMutationDoc",
    ownerPrivateKey: ""
  }
};

export default function BlockchainSimulatorPage() {
  const [transactionType, setTransactionType] = useState("REGISTER");
  const [payloads, setPayloads] = useState(initialPayloads);
  const [steps, setSteps] = useState([]);
  const [logs, setLogs] = useState([]);
  const [blockMeta, setBlockMeta] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchNetworkStatus()
      .then((data) => setNodes(data.blockchain.nodes || []))
      .catch(() => setNodes([]));
  }, []);

  useEffect(() => {
    const socket = getSocket();

    const onStep = (incoming) => {
      setSteps((prev) => {
        const next = prev.filter((item) => item.id !== incoming.id);
        next.push({ id: incoming.id, title: incoming.title, detail: incoming.detail, status: incoming.status });
        return next.sort((a, b) => a.id - b.id);
      });
    };

    const onContractEvent = (event) => {
      setLogs((prev) => [event, ...prev].slice(0, 40));
    };

    socket.on("simulation-step", onStep);
    socket.on("contract-event", onContractEvent);

    return () => {
      socket.off("simulation-step", onStep);
      socket.off("contract-event", onContractEvent);
    };
  }, []);

  const runMap = useMemo(
    () => ({
      REGISTER: registerProperty,
      TRANSFER: transferProperty,
      INHERIT: inheritProperty,
      MUTATE: mutateProperty
    }),
    []
  );

  function updateCurrentPayload(field, value) {
    setPayloads((prev) => ({
      ...prev,
      [transactionType]: {
        ...prev[transactionType],
        [field]: value
      }
    }));
  }

  async function executeSimulation() {
    setLoading(true);
    setError("");

    try {
      const rawPayload = payloads[transactionType];
      const payload = {
        ...rawPayload,
        propertyId: Number(rawPayload.propertyId)
      };
      const runner = runMap[transactionType];
      const result = await runner(payload);
      setSteps(result.steps || []);
      setBlockMeta(result.blockMeta || null);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }

  const currentPayload = payloads[transactionType];

  return (
    <Layout
      title="Blockchain Simulator (Advanced)"
      subtitle="Run real transactions and observe node broadcast, validation, Merkle tree, and hash generation."
      helpText="Use this page for technical demonstration. For normal operations, use Property Transactions."
    >
      <div className="grid gap-5 xl:grid-cols-2">
        <section className="panel p-4 md:p-6">
          <h2 className="text-lg font-semibold text-slate-100">Simulator Control Panel</h2>
          <p className="mt-1 text-sm text-slate-300">Choose transaction type and run blockchain flow.</p>

          <div className="mt-3 flex flex-wrap gap-2">
            {Object.keys(initialPayloads).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setTransactionType(type);
                  setSteps([]);
                  setError("");
                }}
                className={transactionType === type ? "btn-primary" : "btn-secondary"}
              >
                {type}
              </button>
            ))}
          </div>

          <div className="mt-4 grid gap-2">
            {Object.keys(currentPayload).map((field) => (
              <input
                key={field}
                placeholder={field}
                value={currentPayload[field]}
                onChange={(e) => updateCurrentPayload(field, e.target.value)}
              />
            ))}
          </div>

          <button type="button" onClick={executeSimulation} disabled={loading} className="btn-primary mt-3">
            {loading ? "Processing..." : "Run Blockchain Flow"}
          </button>

          {error ? <p className="mt-3 text-sm text-rose-400">{error}</p> : null}

          <div className="mt-4 rounded-xl border border-slate-700 bg-slate-900/65 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-400">Current Payload JSON</p>
            <pre className="mt-2 overflow-x-auto text-[11px] text-slate-300">{JSON.stringify(currentPayload, null, 2)}</pre>
          </div>
        </section>

        <NodeNetworkVisualization nodes={nodes} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <TransactionTimeline steps={steps} title="Technical Blockchain Step Timeline" />
        <HashGeneratorDisplay blockMeta={blockMeta} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <MerkleTreeViewer txHashes={blockMeta?.transactionData || []} merkleRoot={blockMeta?.merkleRoot} />
        <ExecutionLog logs={logs} />
      </div>
    </Layout>
  );
}
