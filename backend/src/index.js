import http from "http";
import express from "express";
import cors from "cors";
import { Server } from "socket.io";
import { config } from "./config.js";
import { blockchainService } from "./lib/blockchain.js";
import { createPropertiesRouter } from "./routes/properties.js";
import { createExplorerRouter } from "./routes/explorer.js";
import { createNetworkRouter } from "./routes/network.js";
import { createDocumentsRouter } from "./routes/documents.js";
import { createSimulatorRouter } from "./routes/simulator.js";
import { createSecurityRouter } from "./routes/security.js";
import { createCrossChainRouter } from "./routes/crosschain.js";
import { registerCrossChainBridge } from "./services/bridgeHandler.js";
import { behaviorLogger } from "../security/behavior_logger.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: config.frontendOrigin,
    methods: ["GET", "POST"]
  }
});

app.use(cors({ origin: config.frontendOrigin }));
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/health", (_req, res) => {
  res.json({
    service: "backend",
    status: "online",
    contractConfigured: Boolean(config.contractAddress),
    timestamp: new Date().toISOString()
  });
});

app.use("/api/properties", createPropertiesRouter(io));
app.use("/api/explorer", createExplorerRouter());
app.use("/api/network", createNetworkRouter());
app.use("/api/documents", createDocumentsRouter());
app.use("/api/simulator", createSimulatorRouter());
app.use("/api/security", createSecurityRouter());
app.use("/crosschain", createCrossChainRouter());

// Catch JSON/body parser and route errors to prevent server crashes on bad requests.
app.use((error, _req, res, _next) => {
  console.error("API error:", error?.message || error);

  if (res.headersSent) {
    return;
  }

  if (error instanceof SyntaxError) {
    res.status(400).json({ error: "Invalid JSON payload" });
    return;
  }

  res.status(error?.statusCode || 500).json({
    error: error?.message || "Internal server error"
  });
});

io.on("connection", (socket) => {
  socket.emit("connection-ready", {
    message: "Connected to blockchain simulator stream",
    at: new Date().toISOString()
  });
});

function getTxHash(event) {
  return event?.log?.transactionHash || event?.transactionHash || "";
}

async function logContractExecutionEvent(payload) {
  try {
    await behaviorLogger.logAction(payload);
  } catch (error) {
    console.warn(`Security log write failed: ${error.message}`);
  }
}

function safeEventHandler(handler) {
  return (...args) => {
    try {
      handler(...args);
    } catch (error) {
      console.error("Contract event handler failure:", error?.message || error);
    }
  };
}

function wireContractEvents() {
  try {
    const contract = blockchainService.requireContract();

    contract.on("PropertyRegistered", safeEventHandler((propertyId, surveyNumber, owner, documentHash, timestamp, event) => {
      const txHash = getTxHash(event);

      io.emit("contract-event", {
        type: "PropertyRegistered",
        propertyId: Number(propertyId),
        surveyNumber,
        owner,
        documentHash,
        timestamp: Number(timestamp),
        txHash
      });

      logContractExecutionEvent({
        user_id: "blockchain_node",
        role: "system",
        action: "smart_contract_execution",
        property_id: String(Number(propertyId)),
        wallet_address: owner,
        device_id: "ethereum-node",
        ip_address: "127.0.0.1",
        session_id: "chain-events",
        metadata: {
          event_type: "PropertyRegistered",
          tx_hash: txHash,
          survey_number: surveyNumber
        }
      });
    }));

    contract.on(
      "OwnershipTransferred",
      safeEventHandler((propertyId, oldOwner, newOwner, documentHash, timestamp, transferType, event) => {
        const txHash = getTxHash(event);

        io.emit("contract-event", {
          type: "OwnershipTransferred",
          propertyId: Number(propertyId),
          oldOwner,
          newOwner,
          documentHash,
          transferType,
          timestamp: Number(timestamp),
          txHash
        });

        logContractExecutionEvent({
          user_id: "blockchain_node",
          role: "system",
          action: "smart_contract_execution",
          property_id: String(Number(propertyId)),
          wallet_address: newOwner,
          device_id: "ethereum-node",
          ip_address: "127.0.0.1",
          session_id: "chain-events",
          metadata: {
            event_type: "OwnershipTransferred",
            tx_hash: txHash,
            transfer_type: transferType,
            from: oldOwner,
            to: newOwner
          }
        });
      })
    );

    contract.on("PropertyMutated", safeEventHandler((propertyId, owner, oldHash, newHash, timestamp, event) => {
      const txHash = getTxHash(event);

      io.emit("contract-event", {
        type: "PropertyMutated",
        propertyId: Number(propertyId),
        owner,
        oldDocumentHash: oldHash,
        newDocumentHash: newHash,
        timestamp: Number(timestamp),
        txHash
      });

      logContractExecutionEvent({
        user_id: "blockchain_node",
        role: "system",
        action: "smart_contract_execution",
        property_id: String(Number(propertyId)),
        wallet_address: owner,
        device_id: "ethereum-node",
        ip_address: "127.0.0.1",
        session_id: "chain-events",
        metadata: {
          event_type: "PropertyMutated",
          tx_hash: txHash
        }
      });
    }));

    console.log("Contract event bridge is active");
  } catch (error) {
    console.warn("Contract event bridge disabled:", error.message);
  }
}

async function startServer() {
  await behaviorLogger.init();
  wireContractEvents();
  registerCrossChainBridge();

  server.listen(config.port, () => {
    console.log(`Backend API listening on http://localhost:${config.port}`);
  });
}

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
});

startServer().catch((error) => {
  console.error("Failed to start backend:", error);
  process.exit(1);
});
