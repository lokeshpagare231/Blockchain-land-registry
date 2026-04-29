import { Router } from "express";
import multer from "multer";
import { uploadDocumentToIpfs } from "../lib/ipfs.js";
import { verifyDocumentWithAi } from "../lib/aiClient.js";
import { behaviorLogger } from "../../security/behavior_logger.js";
import { evaluateActionRisk } from "../../security/risk_engine.js";
import { buildActorContext } from "../../security/context.js";

const upload = multer({ storage: multer.memoryStorage() });

export function createDocumentsRouter() {
  const router = Router();

  router.post("/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "file is required" });
        return;
      }

      const actor = buildActorContext(req, req.body || {});
      await behaviorLogger.logAction({
        ...actor,
        action: "document_upload",
        metadata: {
          filename: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype
        }
      });

      const security = await evaluateActionRisk({
        actor,
        action: "document_upload",
        context: {
          file_size: req.file.size,
          filename: req.file.originalname
        }
      });

      const [ipfsResult, aiResult] = await Promise.all([
        uploadDocumentToIpfs(req.file),
        verifyDocumentWithAi(req.file)
      ]);

      if (String(req.body?.overrideWarning || "false").toLowerCase() === "true") {
        await behaviorLogger.logAction({
          ...actor,
          action: "document_override",
          metadata: {
            reason: req.body?.overrideReason || "Override requested by operator",
            ai_validity: aiResult?.validity || "UNKNOWN"
          }
        });
      }

      res.json({
        filename: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        documentHash: ipfsResult.ipfsHash,
        ipfs: ipfsResult,
        ai: aiResult,
        security
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
