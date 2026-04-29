import { Router } from "express";
import crypto from "crypto";
import { blockchainService } from "../lib/blockchain.js";
import { buildInitialSimulation, finalizeSimulationWithBlock } from "../lib/visualization.js";
import { behaviorLogger } from "../../security/behavior_logger.js";
import { evaluateActionRisk } from "../../security/risk_engine.js";
import { buildActorContext } from "../../security/context.js";

function txHashesFromBlock(block) {
  return (block.transactions || []).map((tx) => (typeof tx === "string" ? tx : tx.hash));
}

function receiptSummary(receipt) {
  return {
    status: receipt.status,
    blockNumber: Number(receipt.blockNumber),
    gasUsed: receipt.gasUsed?.toString(),
    cumulativeGasUsed: receipt.cumulativeGasUsed?.toString(),
    logs: receipt.logs?.length || 0
  };
}

function emitSimulation(io, sessionId, steps) {
  if (!io) {
    return;
  }

  steps.forEach((step, index) => {
    io.emit("simulation-step", {
      sessionId,
      ...step,
      progress: Number((((index + 1) / steps.length) * 100).toFixed(2)),
      emittedAt: new Date().toISOString()
    });
  });
}

function createSessionId() {
  return crypto.randomUUID();
}

function isHexOfLength(value, bytes) {
  return typeof value === "string" && new RegExp(`^0x[a-fA-F0-9]{${bytes * 2}}$`).test(value);
}

function isWalletAddress(value) {
  return isHexOfLength(value, 20);
}

function normalizeErrorMessage(error) {
  if (!error) {
    return "Unknown error";
  }

  if (typeof error === "string") {
    return error;
  }

  return (
    error.shortMessage ||
    error.reason ||
    error?.info?.error?.message ||
    error?.error?.message ||
    error.message ||
    "Request failed"
  );
}

function requireText(value, fieldName) {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required`);
  }
  return normalized;
}

function requirePositiveInt(value, fieldName) {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) {
    throw new Error(`${fieldName} must be a positive integer`);
  }
  return number;
}

function requireWallet(value, fieldName) {
  const wallet = requireText(value, fieldName);
  if (!isWalletAddress(wallet)) {
    throw new Error(`${fieldName} must be a valid wallet address`);
  }
  return wallet;
}

function requirePrivateKey(value, fieldName) {
  const key = requireText(value, fieldName);
  if (!isHexOfLength(key, 32)) {
    throw new Error(`${fieldName} must be a valid 32-byte private key`);
  }
  return key;
}

function validateRegisterPayload(body = {}) {
  return {
    propertyId: requirePositiveInt(body.propertyId, "propertyId"),
    surveyNumber: requireText(body.surveyNumber, "surveyNumber"),
    geoCoordinates: requireText(body.geoCoordinates, "geoCoordinates"),
    ownerWalletAddress: requireWallet(body.ownerWalletAddress, "ownerWalletAddress"),
    documentHash: requireText(body.documentHash, "documentHash")
  };
}

function validateTransferPayload(body = {}) {
  return {
    propertyId: requirePositiveInt(body.propertyId, "propertyId"),
    newOwnerWalletAddress: requireWallet(body.newOwnerWalletAddress, "newOwnerWalletAddress"),
    documentHash: requireText(body.documentHash, "documentHash"),
    currentOwnerPrivateKey: requirePrivateKey(body.currentOwnerPrivateKey, "currentOwnerPrivateKey")
  };
}

function validateInheritPayload(body = {}) {
  return {
    propertyId: requirePositiveInt(body.propertyId, "propertyId"),
    beneficiaryWalletAddress: requireWallet(body.beneficiaryWalletAddress, "beneficiaryWalletAddress"),
    documentHash: requireText(body.documentHash, "documentHash")
  };
}

function validateMutatePayload(body = {}) {
  return {
    propertyId: requirePositiveInt(body.propertyId, "propertyId"),
    documentHash: requireText(body.documentHash, "documentHash"),
    ownerPrivateKey: requirePrivateKey(body.ownerPrivateKey, "ownerPrivateKey")
  };
}

async function safeLogAction(payload) {
  try {
    await behaviorLogger.logAction(payload);
  } catch (error) {
    console.warn(`Security log write failed: ${normalizeErrorMessage(error)}`);
  }
}

async function safeEvaluateActionRisk({ actor, action, context = {} }) {
  try {
    return await evaluateActionRisk({ actor, action, context });
  } catch (error) {
    console.warn(`Risk evaluation failed: ${normalizeErrorMessage(error)}`);
    return {
      riskScore: 0,
      threatLevel: "NORMAL",
      reason: "Risk analysis unavailable",
      recommendedAction: "ALLOW",
      flagged: false,
      requiresAdminReview: false,
      model: "fallback_none",
      signals: {},
      analyzerWarning: normalizeErrorMessage(error)
    };
  }
}

async function processTransaction({
  io,
  sessionId,
  steps,
  action,
  txPromise,
  actor,
  contextMetadata = {}
}) {
  await safeLogAction({
    ...actor,
    action,
    metadata: {
      source: "properties_api",
      ...contextMetadata
    }
  });

  const security = await safeEvaluateActionRisk({
    actor,
    action,
    context: {
      ...contextMetadata,
      property_id: actor.property_id,
      wallet_address: actor.wallet_address
    }
  });

  const { tx, receipt, block } = await txPromise;
  const finalized = finalizeSimulationWithBlock(steps, block, txHashesFromBlock(block));
  emitSimulation(io, sessionId, finalized.steps.slice(3));

  await safeLogAction({
    ...actor,
    action: "smart_contract_execution",
    metadata: {
      tx_hash: tx.hash,
      tx_block: Number(receipt.blockNumber),
      original_action: action,
      risk_score: security.riskScore,
      threat_level: security.threatLevel
    }
  });

  return {
    sessionId,
    txHash: tx.hash,
    receipt: receiptSummary(receipt),
    blockMeta: finalized.blockMeta,
    steps: finalized.steps,
    security
  };
}

async function handleSecuredTransaction({
  req,
  res,
  io,
  simulationType,
  securityAction,
  txPromiseFactory,
  contextMetadata,
  validate
}) {
  const sessionId = createSessionId();
  let payload;

  try {
    payload = validate(req.body || {});
  } catch (error) {
    res.status(400).json({ error: normalizeErrorMessage(error), sessionId, steps: [] });
    return;
  }

  const actor = buildActorContext(req, payload);
  const steps = buildInitialSimulation(simulationType, payload);
  emitSimulation(io, sessionId, steps.slice(0, 3));

  try {
    const result = await processTransaction({
      io,
      sessionId,
      steps,
      action: securityAction,
      txPromise: txPromiseFactory(payload),
      actor,
      contextMetadata
    });

    res.json(result);
  } catch (error) {
    await safeLogAction({
      ...actor,
      action: "admin_action",
      metadata: {
        event: "transaction_failed",
        attempted_action: securityAction,
        error: normalizeErrorMessage(error)
      }
    });

    res.status(400).json({ error: normalizeErrorMessage(error), sessionId, steps });
  }
}

export function createPropertiesRouter(io) {
  const router = Router();

  router.post("/register", async (req, res) => {
    await handleSecuredTransaction({
      req,
      res,
      io,
      simulationType: "REGISTER",
      securityAction: "property_registration",
      validate: validateRegisterPayload,
      txPromiseFactory: (payload) => blockchainService.registerProperty(payload),
      contextMetadata: {
        survey_number: req.body?.surveyNumber,
        geo_coordinates: req.body?.geoCoordinates
      }
    });
  });

  router.post("/transfer", async (req, res) => {
    await handleSecuredTransaction({
      req,
      res,
      io,
      simulationType: "TRANSFER",
      securityAction: "property_transfer_approval",
      validate: validateTransferPayload,
      txPromiseFactory: (payload) => blockchainService.transferOwnership(payload),
      contextMetadata: {
        transfer_type: "SALE",
        new_owner_wallet: req.body?.newOwnerWalletAddress
      }
    });
  });

  router.post("/inherit", async (req, res) => {
    await handleSecuredTransaction({
      req,
      res,
      io,
      simulationType: "INHERIT",
      securityAction: "property_transfer_approval",
      validate: validateInheritPayload,
      txPromiseFactory: (payload) => blockchainService.inheritProperty(payload),
      contextMetadata: {
        transfer_type: "INHERITANCE",
        beneficiary_wallet: req.body?.beneficiaryWalletAddress
      }
    });
  });

  router.post("/mutate", async (req, res) => {
    await handleSecuredTransaction({
      req,
      res,
      io,
      simulationType: "MUTATE",
      securityAction: "admin_action",
      validate: validateMutatePayload,
      txPromiseFactory: (payload) => blockchainService.mutateProperty(payload),
      contextMetadata: {
        mutation: true,
        updated_document_hash: req.body?.documentHash
      }
    });
  });

  router.get("/search", async (req, res) => {
    try {
      const actor = buildActorContext(req, req.query || {});
      await safeLogAction({
        ...actor,
        action: "sensitive_record_access",
        property_id: req.query.propertyId ? String(req.query.propertyId) : null,
        metadata: {
          search_type: "property_search",
          survey_number: req.query.surveyNumber || null
        }
      });

      const query = {
        propertyId: req.query.propertyId,
        surveyNumber: req.query.surveyNumber
      };
      const results = await blockchainService.searchProperties(query);

      res.json({ count: results.length, results });
    } catch (error) {
      res.status(400).json({ error: normalizeErrorMessage(error) });
    }
  });

  router.get("/:propertyId/history", async (req, res) => {
    try {
      const propertyId = requirePositiveInt(req.params.propertyId, "propertyId");
      const actor = buildActorContext(req, req.params || {});
      await safeLogAction({
        ...actor,
        action: "sensitive_record_access",
        property_id: String(propertyId),
        metadata: {
          search_type: "property_history"
        }
      });

      const history = await blockchainService.getPropertyHistory(propertyId);
      res.json({ propertyId, history });
    } catch (error) {
      res.status(400).json({ error: normalizeErrorMessage(error) });
    }
  });

  router.get("/:propertyId/verify/:walletAddress", async (req, res) => {
    try {
      const propertyId = requirePositiveInt(req.params.propertyId, "propertyId");
      const wallet = requireWallet(req.params.walletAddress, "walletAddress");

      const actor = buildActorContext(req, req.params || {});
      await safeLogAction({
        ...actor,
        action: "sensitive_record_access",
        property_id: String(propertyId),
        wallet_address: wallet,
        metadata: {
          search_type: "ownership_verification"
        }
      });

      const isOwner = await blockchainService.verifyOwnership(propertyId, wallet);
      res.json({ propertyId, wallet, isOwner });
    } catch (error) {
      res.status(400).json({ error: normalizeErrorMessage(error) });
    }
  });

  router.get("/:propertyId", async (req, res) => {
    try {
      const propertyId = requirePositiveInt(req.params.propertyId, "propertyId");
      const actor = buildActorContext(req, req.params || {});
      await safeLogAction({
        ...actor,
        action: "sensitive_record_access",
        property_id: String(propertyId),
        metadata: {
          search_type: "property_lookup"
        }
      });

      const property = await blockchainService.getProperty(propertyId);
      res.json(property);
    } catch (error) {
      res.status(404).json({ error: normalizeErrorMessage(error) });
    }
  });

  return router;
}
