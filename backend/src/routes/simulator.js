import { Router } from "express";
import { buildInitialSimulation } from "../lib/visualization.js";

export function createSimulatorRouter() {
  const router = Router();

  router.post("/preview", (req, res) => {
    const { transactionType = "REGISTER", payload = {} } = req.body || {};
    const steps = buildInitialSimulation(transactionType, payload);

    res.json({
      transactionType,
      steps
    });
  });

  return router;
}
