import axios from "axios";
import FormData from "form-data";
import { config } from "../config.js";

export async function verifyDocumentWithAi(file) {
  if (!file) {
    throw new Error("File is required for AI verification");
  }

  try {
    const formData = new FormData();
    formData.append("file", file.buffer, {
      filename: file.originalname || "document.bin",
      contentType: file.mimetype || "application/octet-stream"
    });

    const response = await axios.post(`${config.aiServiceUrl}/verify-document`, formData, {
      headers: formData.getHeaders(),
      timeout: 15000
    });

    return {
      source: "ai-service",
      ...response.data
    };
  } catch (error) {
    const fileHash = file.buffer ? Buffer.from(file.buffer).toString("base64").slice(0, 24) : "N/A";
    return {
      source: "backend-fallback",
      validity: "REVIEW_REQUIRED",
      fraudRiskScore: 0.5,
      duplicateProbability: 0.5,
      extractedText: "AI service unavailable. OCR not performed.",
      suspiciousPatterns: ["AI microservice unreachable"],
      referenceFingerprint: fileHash,
      warning: error.message
    };
  }
}

export async function checkAiServiceHealth() {
  try {
    const response = await axios.get(`${config.aiServiceUrl}/health`, { timeout: 3000 });
    return response.data;
  } catch {
    return {
      status: "offline"
    };
  }
}
