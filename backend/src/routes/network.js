import { Router } from "express";
import { blockchainService } from "../lib/blockchain.js";
import { checkAiServiceHealth } from "../lib/aiClient.js";
import { config } from "../config.js";
import { behaviorLogger } from "../../security/behavior_logger.js";
import { buildActorContext } from "../../security/context.js";

export function createNetworkRouter() {
  const router = Router();

  router.get("/status", async (req, res) => {
    try {
      const actor = buildActorContext(req, req.query || {});
      await behaviorLogger.logAction({
        ...actor,
        action: "blockchain_node_interaction",
        metadata: {
          endpoint: "network_status"
        }
      });

      const [blockchain, ai] = await Promise.all([
        blockchainService.getNetworkStatus(),
        checkAiServiceHealth()
      ]);

      res.json({
        services: {
          backend: "online",
          blockchain: "online",
          ai: ai.status || "online",
          ipfs: "check-via-upload"
        },
        blockchain,
        contractAddress: config.contractAddress,
        rpcUrl: config.rpcUrl,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
