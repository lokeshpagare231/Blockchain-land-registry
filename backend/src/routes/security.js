import { Router } from "express";
import { behaviorLogger } from "../../security/behavior_logger.js";
import { analyzeUserBehavior } from "../../security/risk_engine.js";
import { buildActorContext } from "../../security/context.js";

export function createSecurityRouter() {
  const router = Router();

  router.get("/logs", async (req, res) => {
    try {
      const logs = await behaviorLogger.getLogs({
        user_id: req.query.user_id,
        role: req.query.role,
        action: req.query.action,
        date_from: req.query.date_from,
        date_to: req.query.date_to,
        limit: req.query.limit || 300
      });

      res.json({ count: logs.length, logs });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get("/risk-scores", async (req, res) => {
    try {
      const scores = await behaviorLogger.getRiskScores({
        user_id: req.query.user_id,
        limit: req.query.limit || 200
      });
      res.json({ count: scores.length, scores });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get("/alerts", async (req, res) => {
    try {
      const alerts = await behaviorLogger.getAlerts({
        user_id: req.query.user_id,
        threat_level: req.query.threat_level,
        resolved: req.query.resolved,
        limit: req.query.limit || 200
      });
      res.json({ count: alerts.length, alerts });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get("/analytics", async (_req, res) => {
    try {
      const analytics = await behaviorLogger.getThreatAnalytics();
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post("/analyze-user", async (req, res) => {
    try {
      const actor = buildActorContext(req, req.body || {});
      const userId = req.body?.user_id || actor.user_id;

      const result = await analyzeUserBehavior({
        userId,
        role: req.body?.role || actor.role,
        action: req.body?.action || "admin_action",
        context: {
          property_id: req.body?.property_id || actor.property_id,
          wallet_address: req.body?.wallet_address || actor.wallet_address
        }
      });

      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post("/log-action", async (req, res) => {
    try {
      const actor = buildActorContext(req, req.body || {});
      const log = await behaviorLogger.logAction({
        ...actor,
        action: req.body?.action || "admin_action",
        property_id: req.body?.property_id || actor.property_id,
        metadata: req.body?.metadata || {}
      });

      res.json(log);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
