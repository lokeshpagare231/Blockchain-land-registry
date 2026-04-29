import { Router } from "express";
import { blockchainService } from "../lib/blockchain.js";
import { checkChainIntegrity } from "../lib/visualization.js";
import { behaviorLogger } from "../../security/behavior_logger.js";
import { buildActorContext } from "../../security/context.js";

export function createExplorerRouter() {
  const router = Router();

  router.get("/blocks", async (req, res) => {
    try {
      const actor = buildActorContext(req, req.query || {});
      await behaviorLogger.logAction({
        ...actor,
        action: "sensitive_record_access",
        metadata: {
          explorer_endpoint: "blocks",
          limit: Number(req.query.limit || 20)
        }
      });

      const limit = Number(req.query.limit || 20);
      const blocks = await blockchainService.getRecentBlocks(limit);
      const integrity = checkChainIntegrity(blocks);
      res.json({ count: blocks.length, integrity, blocks });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  router.get("/blocks/:number", async (req, res) => {
    try {
      const actor = buildActorContext(req, req.params || {});
      await behaviorLogger.logAction({
        ...actor,
        action: "sensitive_record_access",
        metadata: {
          explorer_endpoint: "block_details",
          block_number: Number(req.params.number)
        }
      });

      const block = await blockchainService.getBlockByNumber(req.params.number);
      if (!block) {
        res.status(404).json({ error: "Block not found" });
        return;
      }

      res.json(block);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  router.get("/transactions/:hash", async (req, res) => {
    try {
      const actor = buildActorContext(req, req.params || {});
      await behaviorLogger.logAction({
        ...actor,
        action: "sensitive_record_access",
        metadata: {
          explorer_endpoint: "transaction_details",
          tx_hash: req.params.hash
        }
      });

      const tx = await blockchainService.getTransaction(req.params.hash);
      if (!tx) {
        res.status(404).json({ error: "Transaction not found" });
        return;
      }

      res.json(tx);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  router.get("/events", async (req, res) => {
    try {
      const actor = buildActorContext(req, req.query || {});
      await behaviorLogger.logAction({
        ...actor,
        action: "sensitive_record_access",
        metadata: {
          explorer_endpoint: "events",
          limit: Number(req.query.limit || 50)
        }
      });

      const limit = Number(req.query.limit || 50);
      const events = await blockchainService.getContractEvents(limit);
      res.json({ count: events.length, events });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  router.get("/integrity", async (req, res) => {
    try {
      const actor = buildActorContext(req, req.query || {});
      await behaviorLogger.logAction({
        ...actor,
        action: "blockchain_node_interaction",
        metadata: {
          explorer_endpoint: "integrity"
        }
      });

      const blocks = await blockchainService.getRecentBlocks(100);
      const integrity = checkChainIntegrity(blocks);
      res.json({ integrity, latestBlock: blocks.at(-1)?.number || 0 });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  return router;
}
