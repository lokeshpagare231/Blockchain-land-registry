import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000"
});

export async function fetchNetworkStatus() {
  const { data } = await api.get("/api/network/status");
  return data;
}

export async function uploadDocument(formData) {
  const { data } = await api.post("/api/documents/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  return data;
}

export async function registerProperty(payload) {
  const { data } = await api.post("/api/properties/register", payload);
  return data;
}

export async function transferProperty(payload) {
  const { data } = await api.post("/api/properties/transfer", payload);
  return data;
}

export async function inheritProperty(payload) {
  const { data } = await api.post("/api/properties/inherit", payload);
  return data;
}

export async function mutateProperty(payload) {
  const { data } = await api.post("/api/properties/mutate", payload);
  return data;
}

export async function searchProperties(query) {
  const { data } = await api.get("/api/properties/search", { params: query });
  return data;
}

export async function getExplorerBlocks(limit = 20) {
  const { data } = await api.get("/api/explorer/blocks", { params: { limit } });
  return data;
}

export async function getExplorerEvents(limit = 50) {
  const { data } = await api.get("/api/explorer/events", { params: { limit } });
  return data;
}

export async function getBlockDetails(blockNumber) {
  const { data } = await api.get(`/api/explorer/blocks/${blockNumber}`);
  return data;
}

export async function getTransactionDetails(hash) {
  const { data } = await api.get(`/api/explorer/transactions/${hash}`);
  return data;
}

export async function getSecurityLogs(params = {}) {
  const { data } = await api.get("/api/security/logs", { params });
  return data;
}

export async function getSecurityRiskScores(params = {}) {
  const { data } = await api.get("/api/security/risk-scores", { params });
  return data;
}

export async function getSecurityAlerts(params = {}) {
  const { data } = await api.get("/api/security/alerts", { params });
  return data;
}

export async function getSecurityAnalytics() {
  const { data } = await api.get("/api/security/analytics");
  return data;
}

export async function analyzeSecurityUser(payload) {
  const { data } = await api.post("/api/security/analyze-user", payload);
  return data;
}

export async function logSecurityAction(payload) {
  const { data } = await api.post("/api/security/log-action", payload);
  return data;
}

export default api;
