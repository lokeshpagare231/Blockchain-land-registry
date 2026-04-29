import fs from "fs";
import path from "path";
import crypto from "crypto";
import { config } from "../src/config.js";

const SECURITY_STORAGE_DIR = path.resolve(config.storageDir, "security");
const LOGS_FILE = path.resolve(SECURITY_STORAGE_DIR, "behavior_logs.json");
const RISK_FILE = path.resolve(SECURITY_STORAGE_DIR, "risk_scores.json");
const ALERTS_FILE = path.resolve(SECURITY_STORAGE_DIR, "alerts.json");

function ensureStorage() {
  if (!fs.existsSync(SECURITY_STORAGE_DIR)) {
    fs.mkdirSync(SECURITY_STORAGE_DIR, { recursive: true });
  }

  for (const file of [LOGS_FILE, RISK_FILE, ALERTS_FILE]) {
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, "[]", "utf8");
    }
  }
}

function safeReadArray(file) {
  try {
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function safeWriteArray(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
}

function parseDate(value) {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function sortByTimestampDesc(items) {
  return [...items].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

class BehaviorLogger {
  constructor() {
    this.mongoEnabled = false;
    this.mongo = null;
    this.mongoCollections = null;

    ensureStorage();
  }

  async init() {
    if (!config.mongoUri) {
      return;
    }

    try {
      const mongodb = await import("mongodb");
      const client = new mongodb.MongoClient(config.mongoUri, {
        serverSelectionTimeoutMS: 2500
      });
      await client.connect();

      const db = client.db(config.mongoDbName || "land_registry_security");
      this.mongo = client;
      this.mongoCollections = {
        logs: db.collection("behavior_logs"),
        risk: db.collection("risk_scores"),
        alerts: db.collection("security_alerts")
      };
      this.mongoEnabled = true;

      await Promise.all([
        this.mongoCollections.logs.createIndex({ user_id: 1, timestamp: -1 }),
        this.mongoCollections.logs.createIndex({ action: 1, timestamp: -1 }),
        this.mongoCollections.risk.createIndex({ user_id: 1, timestamp: -1 }),
        this.mongoCollections.alerts.createIndex({ user_id: 1, created_at: -1 })
      ]);

      console.log("Security behavior logger connected to MongoDB");
    } catch (error) {
      this.mongoEnabled = false;
      this.mongo = null;
      this.mongoCollections = null;
      console.warn(`Security behavior logger using local storage fallback: ${error.message}`);
    }
  }

  normalizeLog(log) {
    return {
      id: log.id || crypto.randomUUID(),
      user_id: log.user_id || "unknown_user",
      role: log.role || "unknown_role",
      action: log.action || "unknown_action",
      property_id: log.property_id || null,
      timestamp: log.timestamp || new Date().toISOString(),
      ip_address: log.ip_address || "0.0.0.0",
      device_id: log.device_id || "unknown_device",
      wallet_address: log.wallet_address || null,
      session_id: log.session_id || `session-${Date.now()}`,
      metadata: log.metadata || {}
    };
  }

  async logAction(log) {
    const record = this.normalizeLog(log);

    if (this.mongoEnabled) {
      await this.mongoCollections.logs.insertOne(record);
      return record;
    }

    const logs = safeReadArray(LOGS_FILE);
    logs.push(record);
    safeWriteArray(LOGS_FILE, logs.slice(-5000));
    return record;
  }

  async getLogs(filters = {}) {
    const limit = Number(filters.limit || 200);

    if (this.mongoEnabled) {
      const query = buildMongoLogQuery(filters);
      const docs = await this.mongoCollections.logs
        .find(query)
        .sort({ timestamp: -1 })
        .limit(limit)
        .toArray();
      return docs;
    }

    const logs = safeReadArray(LOGS_FILE);
    return applyLogFilters(logs, filters).slice(0, limit);
  }

  async getUserLogs(userId, options = {}) {
    return this.getLogs({ ...options, user_id: userId });
  }

  async writeRiskScore(scoreRecord) {
    const entry = {
      id: scoreRecord.id || crypto.randomUUID(),
      user_id: scoreRecord.user_id,
      role: scoreRecord.role || "unknown_role",
      risk_score: Number(scoreRecord.risk_score || 0),
      threat_level: scoreRecord.threat_level || "NORMAL",
      reason: scoreRecord.reason || "No anomaly detected",
      sequence_length: Number(scoreRecord.sequence_length || 0),
      model: scoreRecord.model || "sequence_anomaly_model",
      recommended_action: scoreRecord.recommended_action || "ALLOW",
      timestamp: scoreRecord.timestamp || new Date().toISOString(),
      metadata: scoreRecord.metadata || {}
    };

    if (this.mongoEnabled) {
      await this.mongoCollections.risk.insertOne(entry);
      return entry;
    }

    const scores = safeReadArray(RISK_FILE);
    scores.push(entry);
    safeWriteArray(RISK_FILE, scores.slice(-3000));
    return entry;
  }

  async getRiskScores(filters = {}) {
    const limit = Number(filters.limit || 200);

    if (this.mongoEnabled) {
      const query = {};
      if (filters.user_id) {
        query.user_id = filters.user_id;
      }
      const docs = await this.mongoCollections.risk
        .find(query)
        .sort({ timestamp: -1 })
        .limit(limit)
        .toArray();
      return docs;
    }

    const scores = safeReadArray(RISK_FILE);
    return sortByTimestampDesc(
      scores.filter((item) => !filters.user_id || item.user_id === filters.user_id)
    ).slice(0, limit);
  }

  async createAlert(alert) {
    const entry = {
      id: alert.id || crypto.randomUUID(),
      user_id: alert.user_id || "unknown_user",
      role: alert.role || "unknown_role",
      threat_level: alert.threat_level || "SUSPICIOUS",
      risk_score: Number(alert.risk_score || 0),
      reason: alert.reason || "Suspicious activity detected",
      action: alert.action || "security_alert",
      property_id: alert.property_id || null,
      requires_admin_review: Boolean(alert.requires_admin_review),
      resolved: Boolean(alert.resolved),
      created_at: alert.created_at || new Date().toISOString(),
      metadata: alert.metadata || {}
    };

    if (this.mongoEnabled) {
      await this.mongoCollections.alerts.insertOne(entry);
      return entry;
    }

    const alerts = safeReadArray(ALERTS_FILE);
    alerts.push(entry);
    safeWriteArray(ALERTS_FILE, alerts.slice(-3000));
    return entry;
  }

  async getAlerts(filters = {}) {
    const limit = Number(filters.limit || 200);

    if (this.mongoEnabled) {
      const query = {};
      if (filters.user_id) {
        query.user_id = filters.user_id;
      }
      if (filters.threat_level) {
        query.threat_level = filters.threat_level;
      }
      if (filters.resolved !== undefined) {
        query.resolved = filters.resolved === "true";
      }

      const docs = await this.mongoCollections.alerts
        .find(query)
        .sort({ created_at: -1 })
        .limit(limit)
        .toArray();
      return docs;
    }

    const alerts = safeReadArray(ALERTS_FILE);
    return sortByTimestampDesc(
      alerts.filter((item) => {
        if (filters.user_id && item.user_id !== filters.user_id) {
          return false;
        }
        if (filters.threat_level && item.threat_level !== filters.threat_level) {
          return false;
        }
        if (filters.resolved !== undefined && item.resolved !== (filters.resolved === "true")) {
          return false;
        }
        return true;
      })
    ).slice(0, limit);
  }

  async getThreatAnalytics() {
    const [logs, alerts, scores] = await Promise.all([
      this.getLogs({ limit: 10000 }),
      this.getAlerts({ limit: 10000 }),
      this.getRiskScores({ limit: 10000 })
    ]);

    const highRiskUsers = new Set(
      scores.filter((item) => item.threat_level === "HIGH").map((item) => item.user_id)
    );

    const suspiciousEvents = alerts.filter((item) => item.threat_level !== "NORMAL").length;

    return {
      total_actions_logged: logs.length,
      suspicious_events_detected: suspiciousEvents,
      high_risk_users: highRiskUsers.size,
      flagged_transactions: alerts.filter((item) => item.action === "flagged_transaction").length
    };
  }
}

function buildMongoLogQuery(filters) {
  const query = {};

  if (filters.user_id) {
    query.user_id = filters.user_id;
  }
  if (filters.role) {
    query.role = filters.role;
  }
  if (filters.action) {
    query.action = filters.action;
  }

  const from = parseDate(filters.date_from || filters.start_date);
  const to = parseDate(filters.date_to || filters.end_date);

  if (from || to) {
    query.timestamp = {};
    if (from) {
      query.timestamp.$gte = from.toISOString();
    }
    if (to) {
      query.timestamp.$lte = to.toISOString();
    }
  }

  return query;
}

function applyLogFilters(logs, filters) {
  const from = parseDate(filters.date_from || filters.start_date);
  const to = parseDate(filters.date_to || filters.end_date);

  return sortByTimestampDesc(
    logs.filter((item) => {
      if (filters.user_id && item.user_id !== filters.user_id) {
        return false;
      }
      if (filters.role && item.role !== filters.role) {
        return false;
      }
      if (filters.action && item.action !== filters.action) {
        return false;
      }

      const ts = parseDate(item.timestamp);
      if (from && (!ts || ts < from)) {
        return false;
      }
      if (to && (!ts || ts > to)) {
        return false;
      }
      return true;
    })
  );
}

export const behaviorLogger = new BehaviorLogger();
