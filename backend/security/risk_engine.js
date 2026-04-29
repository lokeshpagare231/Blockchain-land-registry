import path from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { behaviorLogger } from "./behavior_logger.js";
import { config } from "../src/config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const analyzerScript = path.resolve(__dirname, "threat_detection_service.py");

function toThreatLevel(score) {
  if (score >= config.highRiskThreshold) {
    return "HIGH";
  }
  if (score >= config.suspiciousRiskThreshold) {
    return "SUSPICIOUS";
  }
  return "NORMAL";
}

function recommendedAction(score) {
  if (score >= config.highRiskThreshold) {
    return "REVIEW_REQUIRED";
  }
  if (score >= config.suspiciousRiskThreshold) {
    return "MONITOR";
  }
  return "ALLOW";
}

async function runBehaviorAnalyzer(payload) {
  return new Promise((resolve, reject) => {
    const python = config.pythonPath || "python";
    const child = spawn(python, [analyzerScript], {
      stdio: ["pipe", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `Threat analyzer exited with code ${code}`));
        return;
      }

      try {
        resolve(JSON.parse(stdout || "{}"));
      } catch (error) {
        reject(new Error(`Invalid analyzer output: ${error.message}`));
      }
    });

    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });
}

function fallbackRiskAssessment({ userId, logs, action }) {
  const windowLogs = logs.slice(0, config.sequenceWindowSize);
  const transferActions = windowLogs.filter((entry) =>
    ["property_transfer_approval", "transfer_property", "approve_transfer"].includes(entry.action)
  );
  const rapidThresholdSeconds = 45;

  let rapidCount = 0;
  for (let i = 1; i < windowLogs.length; i += 1) {
    const prev = new Date(windowLogs[i - 1].timestamp).getTime();
    const curr = new Date(windowLogs[i].timestamp).getTime();
    if (!Number.isNaN(prev) && !Number.isNaN(curr) && Math.abs(prev - curr) / 1000 < rapidThresholdSeconds) {
      rapidCount += 1;
    }
  }

  const overrideCount = windowLogs.filter((entry) => entry.action === "document_override").length;
  const risk = Math.min(1, 0.18 + transferActions.length * 0.06 + rapidCount * 0.05 + overrideCount * 0.1);

  return {
    user_id: userId,
    risk_score: Number(risk.toFixed(4)),
    reason:
      risk >= config.highRiskThreshold
        ? "Rapid transfer approvals and overrides detected"
        : risk >= config.suspiciousRiskThreshold
        ? "Elevated transaction velocity"
        : "Behavior pattern within normal range",
    threat_level: toThreatLevel(risk),
    sequence_length: windowLogs.length,
    model: "fallback_sequence_heuristic",
    signals: {
      rapid_actions: rapidCount,
      transfer_actions: transferActions.length,
      override_actions: overrideCount,
      current_action: action
    }
  };
}

export async function analyzeUserBehavior({ userId, role, action, context = {} }) {
  const logs = await behaviorLogger.getUserLogs(userId, { limit: 200 });

  let analysis;
  try {
    analysis = await runBehaviorAnalyzer({
      user_id: userId,
      role,
      action,
      logs,
      context,
      thresholds: {
        suspicious: config.suspiciousRiskThreshold,
        high: config.highRiskThreshold
      }
    });
  } catch (error) {
    analysis = fallbackRiskAssessment({ userId, logs, action });
    analysis.analyzer_warning = error.message;
  }

  const riskScore = Number(analysis.risk_score || 0);
  const threatLevel = analysis.threat_level || toThreatLevel(riskScore);

  const scoreRecord = await behaviorLogger.writeRiskScore({
    user_id: userId,
    role,
    risk_score: riskScore,
    threat_level: threatLevel,
    reason: analysis.reason || "Behavior analyzed",
    sequence_length: analysis.sequence_length || logs.length,
    model: analysis.model || "sequence_anomaly_model",
    recommended_action: recommendedAction(riskScore),
    metadata: {
      action,
      signals: analysis.signals || {},
      analyzer_warning: analysis.analyzer_warning || null,
      context
    }
  });

  if (riskScore >= config.suspiciousRiskThreshold) {
    await behaviorLogger.createAlert({
      user_id: userId,
      role,
      threat_level: threatLevel,
      risk_score: riskScore,
      reason: analysis.reason || "Suspicious behavior detected",
      action: riskScore >= config.highRiskThreshold ? "flagged_transaction" : "behavior_watch",
      property_id: context.property_id || null,
      requires_admin_review: riskScore >= config.highRiskThreshold,
      metadata: {
        analyzed_action: action,
        model: scoreRecord.model,
        signals: analysis.signals || {}
      }
    });
  }

  return {
    user_id: userId,
    role,
    risk_score: riskScore,
    threat_level: threatLevel,
    reason: analysis.reason || "No reason provided",
    sequence_length: analysis.sequence_length || logs.length,
    model: analysis.model || "sequence_anomaly_model",
    recommended_action: recommendedAction(riskScore),
    signals: analysis.signals || {},
    analyzer_warning: analysis.analyzer_warning || null
  };
}

export async function evaluateActionRisk({ actor, action, context = {} }) {
  const userId = actor.user_id || "unknown_user";
  const role = actor.role || "unknown_role";

  const analysis = await analyzeUserBehavior({
    userId,
    role,
    action,
    context: {
      property_id: actor.property_id || null,
      wallet_address: actor.wallet_address || null,
      ...context
    }
  });

  return {
    riskScore: analysis.risk_score,
    threatLevel: analysis.threat_level,
    reason: analysis.reason,
    recommendedAction: analysis.recommended_action,
    flagged: analysis.risk_score >= config.suspiciousRiskThreshold,
    requiresAdminReview: analysis.risk_score >= config.highRiskThreshold,
    model: analysis.model,
    signals: analysis.signals,
    analyzerWarning: analysis.analyzer_warning
  };
}
