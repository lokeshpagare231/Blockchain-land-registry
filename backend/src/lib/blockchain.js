import fs from "fs";
import path from "path";
import { ethers } from "ethers";
import { fileURLToPath } from "url";
import { config } from "../config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadFallbackAbi() {
  const artifactPath = path.resolve(
    __dirname,
    "..",
    "..",
    "..",
    "smart-contracts",
    "artifacts",
    "contracts",
    "PropertyRegistry.sol",
    "PropertyRegistry.json"
  );

  if (!fs.existsSync(artifactPath)) {
    return [];
  }

  try {
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    return artifact.abi || [];
  } catch {
    return [];
  }
}

class BlockchainService {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl, config.chainId);
    this.defaultWallet = new ethers.Wallet(config.privateKey, this.provider);
    this.abi = config.contractAbi.length ? config.contractAbi : loadFallbackAbi();
    this.contractAddress = config.contractAddress;
    this.contract = null;

    if (this.contractAddress && this.abi.length) {
      this.contract = new ethers.Contract(this.contractAddress, this.abi, this.defaultWallet);
    }
  }

  requireContract() {
    if (!this.contract) {
      throw new Error(
        "Contract is not initialized. Deploy smart contract and configure CONTRACT_ADDRESS or deployment.local.json"
      );
    }
    return this.contract;
  }

  withSigner(privateKey) {
    const base = this.requireContract();
    if (!privateKey) {
      return base;
    }
    const wallet = new ethers.Wallet(privateKey, this.provider);
    return base.connect(wallet);
  }

  async registerProperty(payload) {
    const contract = this.requireContract();
    const tx = await contract.registerProperty(
      payload.propertyId,
      payload.surveyNumber,
      payload.geoCoordinates,
      payload.ownerWalletAddress,
      payload.documentHash
    );
    const receipt = await tx.wait();
    const block = await this.provider.getBlock(receipt.blockNumber, true);
    return { tx, receipt, block };
  }

  async transferOwnership(payload) {
    const contract = this.withSigner(payload.currentOwnerPrivateKey);
    const tx = await contract.transferOwnership(
      payload.propertyId,
      payload.newOwnerWalletAddress,
      payload.documentHash
    );
    const receipt = await tx.wait();
    const block = await this.provider.getBlock(receipt.blockNumber, true);
    return { tx, receipt, block };
  }

  async inheritProperty(payload) {
    const contract = this.requireContract();
    const tx = await contract.inheritProperty(
      payload.propertyId,
      payload.beneficiaryWalletAddress,
      payload.documentHash
    );
    const receipt = await tx.wait();
    const block = await this.provider.getBlock(receipt.blockNumber, true);
    return { tx, receipt, block };
  }

  async mutateProperty(payload) {
    const contract = this.withSigner(payload.ownerPrivateKey);
    const tx = await contract.mutateProperty(payload.propertyId, payload.documentHash);
    const receipt = await tx.wait();
    const block = await this.provider.getBlock(receipt.blockNumber, true);
    return { tx, receipt, block };
  }

  async verifyOwnership(propertyId, walletAddress) {
    const contract = this.requireContract();
    return contract.verifyOwnership(propertyId, walletAddress);
  }

  async getProperty(propertyId) {
    const contract = this.requireContract();
    const property = await contract.getProperty(propertyId);
    return normalizeProperty(property);
  }

  async getPropertyHistory(propertyId) {
    const contract = this.requireContract();
    const history = await contract.getPropertyHistory(propertyId);
    return history.map((entry) => ({
      action: entry.action,
      from: entry.from,
      to: entry.to,
      documentHash: entry.documentHash,
      timestamp: Number(entry.timestamp),
      blockNumber: Number(entry.blockNumber)
    }));
  }

  async searchProperties({ propertyId, surveyNumber, ownerWalletAddress }) {
    const contract = this.requireContract();

    if (propertyId) {
      const property = await this.getProperty(Number(propertyId));
      const history = await this.getPropertyHistory(Number(propertyId));
      return [{ ...property, history }];
    }

    const filter = contract.filters.PropertyRegistered();
    const events = await contract.queryFilter(filter, 0, "latest");
    const ids = [...new Set(events.map((event) => Number(event.args.propertyId)))];

    const properties = [];
    for (const id of ids) {
      const property = await this.getProperty(id);

      if (surveyNumber && property.surveyNumber !== surveyNumber) {
        continue;
      }

      if (
        ownerWalletAddress &&
        property.ownerWalletAddress.toLowerCase() !== ownerWalletAddress.toLowerCase()
      ) {
        continue;
      }

      const history = await this.getPropertyHistory(id);
      properties.push({ ...property, history });
    }

    return properties;
  }

  async getRecentBlocks(limit = 10) {
    const latest = await this.provider.getBlockNumber();
    const blocks = [];

    for (let i = latest; i >= 0 && blocks.length < limit; i -= 1) {
      const block = await this.provider.getBlock(i, true);
      if (!block) {
        continue;
      }

      blocks.push({
        number: Number(block.number),
        hash: block.hash,
        previousHash: block.parentHash,
        timestamp: Number(block.timestamp),
        nonce: Number(block.nonce || 0),
        transactionHashes: (block.transactions || []).map((tx) =>
          typeof tx === "string" ? tx : tx.hash
        )
      });
    }

    return blocks.reverse();
  }

  async getBlockByNumber(blockNumber) {
    const block = await this.provider.getBlock(Number(blockNumber), true);
    if (!block) {
      return null;
    }

    return {
      number: Number(block.number),
      hash: block.hash,
      previousHash: block.parentHash,
      timestamp: Number(block.timestamp),
      nonce: Number(block.nonce || 0),
      transactions: (block.transactions || []).map((tx) => ({
        hash: typeof tx === "string" ? tx : tx.hash,
        from: typeof tx === "string" ? undefined : tx.from,
        to: typeof tx === "string" ? undefined : tx.to,
        value: typeof tx === "string" ? undefined : tx.value?.toString()
      }))
    };
  }

  async getTransaction(txHash) {
    const tx = await this.provider.getTransaction(txHash);
    if (!tx) {
      return null;
    }

    const receipt = await this.provider.getTransactionReceipt(txHash);

    return {
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      nonce: tx.nonce,
      gasLimit: tx.gasLimit?.toString(),
      gasPrice: tx.gasPrice?.toString(),
      value: tx.value?.toString(),
      blockNumber: tx.blockNumber,
      status: receipt?.status ?? null,
      logs: receipt?.logs?.length ?? 0
    };
  }

  async getContractEvents(limit = 50) {
    const contract = this.requireContract();

    const [registered, transferred, mutated] = await Promise.all([
      contract.queryFilter(contract.filters.PropertyRegistered(), 0, "latest"),
      contract.queryFilter(contract.filters.OwnershipTransferred(), 0, "latest"),
      contract.queryFilter(contract.filters.PropertyMutated(), 0, "latest")
    ]);

    const mapped = [
      ...registered.map((event) => ({
        type: "PropertyRegistered",
        txHash: event.transactionHash,
        blockNumber: Number(event.blockNumber),
        propertyId: Number(event.args.propertyId),
        owner: event.args.owner,
        timestamp: Number(event.args.timestamp)
      })),
      ...transferred.map((event) => ({
        type: "OwnershipTransferred",
        txHash: event.transactionHash,
        blockNumber: Number(event.blockNumber),
        propertyId: Number(event.args.propertyId),
        oldOwner: event.args.oldOwner,
        newOwner: event.args.newOwner,
        transferType: event.args.transferType,
        timestamp: Number(event.args.timestamp)
      })),
      ...mutated.map((event) => ({
        type: "PropertyMutated",
        txHash: event.transactionHash,
        blockNumber: Number(event.blockNumber),
        propertyId: Number(event.args.propertyId),
        owner: event.args.owner,
        timestamp: Number(event.args.timestamp)
      }))
    ];

    return mapped.sort((a, b) => b.blockNumber - a.blockNumber).slice(0, limit);
  }

  async getNetworkStatus() {
    const [blockNumber, chainId, feeData, accounts] = await Promise.all([
      this.provider.getBlockNumber(),
      this.provider.getNetwork(),
      this.provider.getFeeData(),
      this.provider.send("eth_accounts", [])
    ]);

    return {
      rpcUrl: config.rpcUrl,
      chainId: Number(chainId.chainId),
      latestBlock: blockNumber,
      gasPriceWei: feeData.gasPrice?.toString() || "0",
      nodeCount: accounts.length,
      nodes: accounts.map((address, index) => ({
        nodeId: `NODE-${index + 1}`,
        address,
        status: "online"
      }))
    };
  }
}

function normalizeProperty(property) {
  return {
    propertyId: Number(property.propertyId),
    surveyNumber: property.surveyNumber,
    geoCoordinates: property.geoCoordinates,
    ownerWalletAddress: property.ownerWalletAddress,
    documentHash: property.documentHash,
    timestamp: Number(property.timestamp),
    exists: property.exists
  };
}

export const blockchainService = new BlockchainService();
