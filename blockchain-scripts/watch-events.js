import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { ethers } from "ethers";

dotenv.config();

const deploymentPath = path.resolve("deployment.local.json");
if (!fs.existsSync(deploymentPath)) {
  throw new Error("deployment.local.json not found. Deploy contract first.");
}

const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || "http://127.0.0.1:8545");
const contract = new ethers.Contract(deployment.contractAddress, deployment.abi, provider);

function txHashFromEvent(event) {
  return event?.log?.transactionHash || event?.transactionHash || "";
}

console.log("Watching events for contract:", deployment.contractAddress);

contract.on("PropertyRegistered", (propertyId, surveyNumber, owner, documentHash, timestamp, event) => {
  console.log("[PropertyRegistered]", {
    propertyId: Number(propertyId),
    surveyNumber,
    owner,
    documentHash,
    timestamp: Number(timestamp),
    txHash: txHashFromEvent(event)
  });
});

contract.on("OwnershipTransferred", (propertyId, oldOwner, newOwner, documentHash, timestamp, transferType, event) => {
  console.log("[OwnershipTransferred]", {
    propertyId: Number(propertyId),
    oldOwner,
    newOwner,
    documentHash,
    transferType,
    timestamp: Number(timestamp),
    txHash: txHashFromEvent(event)
  });
});

contract.on("PropertyMutated", (propertyId, owner, oldHash, newHash, timestamp, event) => {
  console.log("[PropertyMutated]", {
    propertyId: Number(propertyId),
    owner,
    oldHash,
    newHash,
    timestamp: Number(timestamp),
    txHash: txHashFromEvent(event)
  });
});
