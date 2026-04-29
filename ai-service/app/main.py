from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from .verifier import verifier

app = FastAPI(title="Land Registry AI Verification Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {
        "status": "online",
        "service": "ai-verification",
    }


@app.post("/verify-document")
async def verify_document(file: UploadFile = File(...)) -> dict:
    data = await file.read()
    result = verifier.verify(data)

    return {
        "filename": file.filename,
        "validity": result.validity,
        "fraudRiskScore": result.fraud_risk_score,
        "duplicateProbability": result.duplicate_probability,
        "extractedText": result.extracted_text,
        "suspiciousPatterns": result.suspicious_patterns,
        "referenceFingerprint": result.reference_fingerprint,
    }
