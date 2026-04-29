import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { ethers } from "ethers";

dotenv.config();

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || "http://127.0.0.1:8545");
const deploymentPath = path.resolve("deployment.local.json");

if (!fs.existsSync(deploymentPath)) {
  throw new Error("deployment.local.json not found. Deploy contract first.");
}

const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

async function main() {
  const latest = await provider.getBlockNumber();
  const start = Math.max(0, latest - 10);

  console.log(`Inspecting blocks ${start} -> ${latest}`);

  for (let i = start; i <= latest; i += 1) {
    const block = await provider.getBlock(i, true);
    if (!block) continue;

    console.log({
      number: Number(block.number),
      hash: block.hash,
      previousHash: block.parentHash,
      timestamp: Number(block.timestamp),
      txCount: block.transactions.length
    });
  }

  const contract = new ethers.Contract(deployment.contractAddress, deployment.abi, provider);
  const events = await contract.queryFilter(contract.filters.PropertyRegistered(), 0, "latest");
  console.log(`Total registered properties: ${events.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
