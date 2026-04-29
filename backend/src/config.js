import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

function loadDeployment() {
  const configured = process.env.DEPLOYMENT_FILE || "../blockchain-scripts/deployment.local.json";
  const deploymentPath = path.resolve(projectRoot, configured);

  if (!fs.existsSync(deploymentPath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  } catch {
    return null;
  }
}

const deployment = loadDeployment();

export const config = {
  port: Number(process.env.PORT || 4000),
  frontendOrigin: process.env.FRONTEND_ORIGIN || "http://localhost:3000",
  rpcUrl: process.env.RPC_URL || "http://127.0.0.1:8545",
  chainId: Number(process.env.CHAIN_ID || deployment?.chainId || 31337),
  privateKey:
    process.env.PRIVATE_KEY ||
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  contractAddress: process.env.CONTRACT_ADDRESS || deployment?.contractAddress || "",
  contractAbi: deployment?.abi || [],
  ipfsUrl: process.env.IPFS_URL || "http://127.0.0.1:5001/api/v0",
  aiServiceUrl: process.env.AI_SERVICE_URL || "http://127.0.0.1:8001",
  mongoUri: process.env.MONGO_URI || "",
  mongoDbName: process.env.MONGO_DB_NAME || "land_registry_security",
  pythonPath: process.env.PYTHON_PATH || "python",
  suspiciousRiskThreshold: Number(process.env.SUSPICIOUS_RISK_THRESHOLD || 0.3),
  highRiskThreshold: Number(process.env.HIGH_RISK_THRESHOLD || 0.6),
  sequenceWindowSize: Number(process.env.SEQUENCE_WINDOW_SIZE || 40),
  projectRoot,
  storageDir: path.resolve(projectRoot, "storage")
};

