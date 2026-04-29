import { blockchainService } from "../lib/blockchain.js";
import { crossChainService } from "./crossChainService.js";

function extractTxHash(event) {
  return event?.log?.transactionHash || event?.transactionHash || "";
}

function extractBlockNumber(event) {
  return Number(event?.log?.blockNumber || event?.blockNumber || 0) || null;
}

function safeCrossChainHandler(handler) {
  return (...args) => {
    handler(...args).catch((error) => {
      console.warn("Cross-chain bridge handler failure:", error?.message || error);
    });
  };
}

async function anchorContractEvent(eventName, event, metadata = {}) {
  const ethTxHash = extractTxHash(event);
  if (!ethTxHash) {
    return null;
  }

  const result = await crossChainService.anchorTransaction({
    ethTxHash,
    sourceBlockNumber: extractBlockNumber(event),
    metadata: {
      eventName,
      ...metadata
    }
  });

  return result;
}

export function registerCrossChainBridge() {
  try {
    const contract = blockchainService.requireContract();

    contract.on(
      "PropertyRegistered",
      safeCrossChainHandler(async (propertyId, surveyNumber, owner, _documentHash, _timestamp, event) => {
        await anchorContractEvent("PropertyRegistered", event, {
          propertyId: Number(propertyId),
          surveyNumber,
          owner
        });
      })
    );

    contract.on(
      "OwnershipTransferred",
      safeCrossChainHandler(async (propertyId, oldOwner, newOwner, _documentHash, _timestamp, transferType, event) => {
        await anchorContractEvent("OwnershipTransferred", event, {
          propertyId: Number(propertyId),
          oldOwner,
          newOwner,
          transferType
        });
      })
    );

    contract.on(
      "PropertyMutated",
      safeCrossChainHandler(async (propertyId, owner, _oldHash, _newHash, _timestamp, event) => {
        await anchorContractEvent("PropertyMutated", event, {
          propertyId: Number(propertyId),
          owner
        });
      })
    );

    console.log("Cross-chain security bridge is active");
  } catch (error) {
    console.warn("Cross-chain security bridge disabled:", error.message);
  }
}

export async function anchorEthereumTransaction(payload) {
  return crossChainService.anchorTransaction(payload);
}

export async function getCrossChainStatus(txHash) {
  return crossChainService.getStatus(txHash);
}
