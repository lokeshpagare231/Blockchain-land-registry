import crypto from "crypto";

export function buildActorContext(req, body = {}) {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = Array.isArray(forwarded) ? forwarded[0] : (forwarded || req.ip || req.socket?.remoteAddress);

  return {
    user_id: req.headers["x-user-id"] || body.user_id || body.userId || "operator_demo",
    role: req.headers["x-user-role"] || body.role || "registrar",
    session_id: req.headers["x-session-id"] || body.session_id || `sess-${crypto.randomUUID().slice(0, 8)}`,
    device_id: req.headers["x-device-id"] || body.device_id || "web-dashboard",
    ip_address: String(ip || "127.0.0.1"),
    wallet_address:
      req.headers["x-wallet-address"] ||
      body.wallet_address ||
      body.ownerWalletAddress ||
      body.newOwnerWalletAddress ||
      body.beneficiaryWalletAddress ||
      null,
    property_id: normalizePropertyId(body.property_id || body.propertyId || body.property_id_str || null)
  };
}

function normalizePropertyId(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  return String(value);
}
