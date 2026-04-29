import { computeMerkleRoot, sha256, nowIso } from "../utils/hash.js";

export function buildInitialSimulation(transactionType, payload) {
  const txData = JSON.stringify({ transactionType, payload, at: nowIso() });

  return [
    { id: 1, title: "Transaction Created", status: "done", detail: txData },
    { id: 2, title: "Transaction Broadcast", status: "done", detail: "Broadcast to validator nodes" },
    { id: 3, title: "Nodes Validate Transaction", status: "done", detail: "Signature and state checks complete" },
    { id: 4, title: "Transactions Grouped Into Block", status: "pending", detail: "Waiting for mining" },
    { id: 5, title: "Merkle Tree Generated", status: "pending", detail: "Merkle root will be calculated" },
    { id: 6, title: "Block Hash Generated", status: "pending", detail: "SHA256 over block payload" },
    { id: 7, title: "Block Linked", status: "pending", detail: "Current block references previous hash" },
    { id: 8, title: "Ledger Updated", status: "pending", detail: "Ownership state persisted" }
  ];
}

export function finalizeSimulationWithBlock(steps, block, txHashes = []) {
  const merkleRoot = computeMerkleRoot(txHashes);
  const blockPayload = `${block.number}${block.parentHash}${block.timestamp}${merkleRoot}${txHashes.join("")}`;
  const currentHash = block.hash || sha256(blockPayload);

  return {
    steps: steps.map((step) => {
      if (step.id <= 3) {
        return step;
      }

      if (step.id === 4) {
        return {
          ...step,
          status: "done",
          detail: `Block #${block.number} includes ${txHashes.length || 1} transaction(s)`
        };
      }

      if (step.id === 5) {
        return {
          ...step,
          status: "done",
          detail: `MerkleRoot: ${merkleRoot}`
        };
      }

      if (step.id === 6) {
        return {
          ...step,
          status: "done",
          detail: `CurrentHash: ${currentHash}`
        };
      }

      if (step.id === 7) {
        return {
          ...step,
          status: "done",
          detail: `PreviousHash: ${block.parentHash}`
        };
      }

      return {
        ...step,
        status: "done",
        detail: "State transition committed"
      };
    }),
    blockMeta: {
      blockNumber: Number(block.number),
      previousHash: block.parentHash,
      currentHash,
      timestamp: Number(block.timestamp),
      merkleRoot,
      transactionData: txHashes,
      nonce: Number(block.nonce || 0)
    }
  };
}

export function checkChainIntegrity(blocks) {
  if (!Array.isArray(blocks) || blocks.length < 2) {
    return { valid: true };
  }

  for (let i = 1; i < blocks.length; i += 1) {
    if (blocks[i].previousHash !== blocks[i - 1].hash) {
      return {
        valid: false,
        brokenAt: blocks[i].number,
        message: "Chain integrity broken"
      };
    }
  }

  return { valid: true };
}
