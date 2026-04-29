import fs from "fs";
import path from "path";
import { ethers } from "ethers";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, "..", "..");

const ANCHOR_ABI = [
  "function anchorProof(bytes32 ethTxHash, bytes32 proofHash, uint256 sourceChainId, uint256 sourceTimestamp, uint256 nonce) external",
  "function getProof(bytes32 ethTxHash) external view returns (bytes32 proofHash, uint256 sourceChainId, uint256 sourceTimestamp, uint256 nonce, address relayer, uint256 anchoredAt)",
  "event CrossChainProofAnchored(bytes32 indexed ethTxHash, bytes32 indexed proofHash, uint256 sourceChainId, uint256 nonce, address indexed relayer)"
];

const DEFAULT_CONFIG = {
  enabled: String(process.env.CROSS_CHAIN_ENABLED || "true").toLowerCase() !== "false",
  secondaryRpcUrl: process.env.SECONDARY_CHAIN_RPC_URL || "",
  secondaryChainId: Number(process.env.SECONDARY_CHAIN_ID || 80002),
  sourceChainId: Number(process.env.CHAIN_ID || 31337),
  relayerPrivateKey: process.env.CROSS_CHAIN_RELAYER_PRIVATE_KEY || process.env.PRIVATE_KEY || "",
  anchorContractAddress: process.env.CROSS_CHAIN_ANCHOR_CONTRACT || "",
  maxTimestampSkewMs: Number(process.env.CROSS_CHAIN_MAX_TIMESTAMP_SKEW_MS || 10 * 60 * 1000),
  storePath: path.resolve(
    backendRoot,
    process.env.CROSS_CHAIN_ANCHOR_STORE || "storage/crosschain-anchors.json"
  )
};

function ensureHex32(value, fieldName) {
  if (!ethers.isHexString(value, 32)) {
    throw new Error(`${fieldName} must be a 32-byte hex string`);
  }
  return ethers.hexlify(value);
}

function ensureStorageFile(storePath) {
  const dir = path.dirname(storePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(storePath)) {
    fs.writeFileSync(storePath, JSON.stringify({ anchors: [] }, null, 2));
  }
}

function readStore(storePath) {
  ensureStorageFile(storePath);
  try {
    const parsed = JSON.parse(fs.readFileSync(storePath, "utf8"));
    return Array.isArray(parsed.anchors) ? parsed : { anchors: [] };
  } catch {
    return { anchors: [] };
  }
}

function writeStore(storePath, store) {
  ensureStorageFile(storePath);
  fs.writeFileSync(storePath, JSON.stringify(store, null, 2));
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeTimestamp(timestamp = Date.now()) {
  const value = Number(timestamp);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("timestamp must be a positive unix millisecond value");
  }
  return value;
}

function nextNonce(records) {
  const max = records.reduce((highest, record) => Math.max(highest, Number(record.nonce || 0)), 0);
  return max + 1;
}

export class CrossChainService {
  constructor(options = {}) {
    this.config = { ...DEFAULT_CONFIG, ...options };
  }

  get enabled() {
    return this.config.enabled;
  }

  generateTransactionHash(ethTxHash) {
    const normalized = ensureHex32(ethTxHash, "ethTxHash");
    return ethers.keccak256(ethers.getBytes(normalized));
  }

  buildProofHash({ ethTxHash, sourceChainId, secondaryChainId, timestamp, nonce }) {
    const normalizedTxHash = ensureHex32(ethTxHash, "ethTxHash");
    return ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["bytes32", "uint256", "uint256", "uint256", "uint256"],
        [normalizedTxHash, Number(sourceChainId), Number(secondaryChainId), Number(timestamp), Number(nonce)]
      )
    );
  }

  async anchorTransaction(input = {}) {
    if (!this.enabled) {
      return {
        status: "DISABLED",
        message: "Cross-chain anchoring is disabled"
      };
    }

    const ethTxHash = ensureHex32(input.ethTxHash, "ethTxHash");
    const sourceChainId = Number(input.sourceChainId || this.config.sourceChainId);
    const secondaryChainId = Number(input.secondaryChainId || this.config.secondaryChainId);
    const timestamp = normalizeTimestamp(input.timestamp || Date.now());

    if (Math.abs(Date.now() - timestamp) > this.config.maxTimestampSkewMs) {
      return this.persistReplayBlocked({
        ethTxHash,
        sourceChainId,
        secondaryChainId,
        timestamp,
        reason: "Timestamp outside accepted replay-protection window"
      });
    }

    const store = readStore(this.config.storePath);
    const existing = store.anchors.find((record) => record.ethTxHash.toLowerCase() === ethTxHash.toLowerCase());
    if (existing) {
      return {
        ...existing,
        replayProtected: true,
        message: "Anchor already exists for this Ethereum transaction hash"
      };
    }

    const nonce = nextNonce(store.anchors);
    const transactionHash = this.generateTransactionHash(ethTxHash);
    const proofHash = this.buildProofHash({
      ethTxHash,
      sourceChainId,
      secondaryChainId,
      timestamp,
      nonce
    });

    const baseRecord = {
      ethTxHash,
      transactionHash,
      proofHash,
      crossChainHash: "",
      sourceChainId,
      secondaryChainId,
      sourceBlockNumber: input.sourceBlockNumber || null,
      nonce,
      timestamp,
      status: "PENDING",
      mismatch: false,
      metadata: input.metadata || {},
      createdAt: nowIso(),
      updatedAt: nowIso()
    };

    const anchoredRecord = await this.submitAnchor(baseRecord);
    store.anchors.push(anchoredRecord);
    writeStore(this.config.storePath, store);
    return anchoredRecord;
  }

  async submitAnchor(record) {
    if (!this.config.secondaryRpcUrl || !this.config.anchorContractAddress) {
      return {
        ...record,
        status: "PENDING_CONFIG",
        message: "Secondary RPC URL or anchor contract address is not configured",
        updatedAt: nowIso()
      };
    }

    try {
      const provider = new ethers.JsonRpcProvider(this.config.secondaryRpcUrl, this.config.secondaryChainId);
      const wallet = new ethers.Wallet(this.config.relayerPrivateKey, provider);
      const anchor = new ethers.Contract(this.config.anchorContractAddress, ANCHOR_ABI, wallet);
      const tx = await anchor.anchorProof(
        record.ethTxHash,
        record.proofHash,
        record.sourceChainId,
        record.timestamp,
        record.nonce
      );
      const receipt = await tx.wait();

      return {
        ...record,
        crossChainHash: tx.hash,
        crossChainBlockNumber: Number(receipt.blockNumber),
        status: receipt.status === 1 ? "ANCHORED" : "FAILED",
        updatedAt: nowIso()
      };
    } catch (error) {
      return {
        ...record,
        status: "FAILED",
        error: error.shortMessage || error.message,
        updatedAt: nowIso()
      };
    }
  }

  persistReplayBlocked(input) {
    const store = readStore(this.config.storePath);
    const record = {
      ethTxHash: input.ethTxHash,
      transactionHash: this.generateTransactionHash(input.ethTxHash),
      proofHash: "",
      crossChainHash: "",
      sourceChainId: input.sourceChainId,
      secondaryChainId: input.secondaryChainId,
      nonce: null,
      timestamp: input.timestamp,
      status: "REPLAY_BLOCKED",
      mismatch: true,
      reason: input.reason,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    store.anchors.push(record);
    writeStore(this.config.storePath, store);
    return record;
  }

  async getStatus(txHash) {
    const ethTxHash = ensureHex32(txHash, "txHash");
    const store = readStore(this.config.storePath);
    const record = store.anchors.find((item) => item.ethTxHash.toLowerCase() === ethTxHash.toLowerCase());

    if (!record) {
      return {
        ethTxHash,
        status: "NOT_FOUND",
        mismatch: false
      };
    }

    return this.verifyConsistency(record);
  }

  async verifyConsistency(record) {
    const expectedProofHash = record.nonce
      ? this.buildProofHash({
          ethTxHash: record.ethTxHash,
          sourceChainId: record.sourceChainId,
          secondaryChainId: record.secondaryChainId,
          timestamp: record.timestamp,
          nonce: record.nonce
        })
      : record.proofHash;

    const localMismatch = Boolean(record.proofHash && expectedProofHash !== record.proofHash);

    if (!this.config.secondaryRpcUrl || !this.config.anchorContractAddress || record.status !== "ANCHORED") {
      return {
        ...record,
        expectedProofHash,
        status: localMismatch ? "MISMATCH" : record.status,
        mismatch: localMismatch
      };
    }

    try {
      const provider = new ethers.JsonRpcProvider(this.config.secondaryRpcUrl, this.config.secondaryChainId);
      const anchor = new ethers.Contract(this.config.anchorContractAddress, ANCHOR_ABI, provider);
      const proof = await anchor.getProof(record.ethTxHash);
      const onChainProofHash = proof.proofHash;
      const mismatch = localMismatch || onChainProofHash.toLowerCase() !== record.proofHash.toLowerCase();

      return {
        ...record,
        expectedProofHash,
        onChainProofHash,
        status: mismatch ? "MISMATCH" : "VERIFIED",
        mismatch
      };
    } catch (error) {
      return {
        ...record,
        expectedProofHash,
        status: "VERIFY_FAILED",
        mismatch: localMismatch,
        error: error.shortMessage || error.message
      };
    }
  }
}

export const crossChainService = new CrossChainService();
