import { Router } from "express";
import { anchorEthereumTransaction, getCrossChainStatus } from "../services/bridgeHandler.js";

export function createCrossChainRouter() {
  const router = Router();

  router.post("/anchor", async (req, res) => {
    try {
      const result = await anchorEthereumTransaction({
        ethTxHash: req.body?.ethTxHash,
        sourceChainId: req.body?.sourceChainId,
        secondaryChainId: req.body?.secondaryChainId,
        sourceBlockNumber: req.body?.sourceBlockNumber,
        timestamp: req.body?.timestamp,
        metadata: req.body?.metadata || {}
      });

      res.json(result);
    } catch (error) {
      res.status(400).json({
        error: error.shortMessage || error.message
      });
    }
  });

  router.get("/status/:txHash", async (req, res) => {
    try {
      const result = await getCrossChainStatus(req.params.txHash);
      const statusCode = result.status === "NOT_FOUND" ? 404 : 200;
      res.status(statusCode).json(result);
    } catch (error) {
      res.status(400).json({
        error: error.shortMessage || error.message
      });
    }
  });

  return router;
}
