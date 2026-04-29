import hashlib
import io
import os
import re
from collections import Counter
from dataclasses import dataclass
from typing import Dict, List

import numpy as np
import pytesseract
import torch
from PIL import Image

if os.getenv("TESSERACT_CMD"):
    pytesseract.pytesseract.tesseract_cmd = os.getenv("TESSERACT_CMD")

SUSPICIOUS_KEYWORDS = [
    "overwritten",
    "correction fluid",
    "tampered",
    "fake",
    "duplicate",
    "erased",
    "modified"
]


@dataclass
class VerificationResult:
    validity: str
    fraud_risk_score: float
    duplicate_probability: float
    extracted_text: str
    suspicious_patterns: List[str]
    reference_fingerprint: str


class DocumentVerifier:
    def __init__(self) -> None:
        self._fingerprints: Dict[str, int] = {}
        self._text_signatures: Dict[str, np.ndarray] = {}
        self._weights = torch.tensor([0.18, 0.16, 0.12, 0.36, 0.08], dtype=torch.float32)
        self._bias = torch.tensor(-1.35, dtype=torch.float32)

    def _extract_text(self, file_bytes: bytes) -> str:
        # OCR works best for image files; fallback decoding is used for other file types.
        try:
            image = Image.open(io.BytesIO(file_bytes))
            text = pytesseract.image_to_string(image)
            if text.strip():
                return text
        except Exception:
            pass

        try:
            return file_bytes.decode("utf-8", errors="ignore")
        except Exception:
            return ""

    def _compute_text_signature(self, text: str) -> np.ndarray:
        normalized = re.sub(r"\s+", "", text.lower())
        if not normalized:
            return np.zeros(36, dtype=np.float32)

        counts = Counter(ch for ch in normalized if ch.isalnum())
        vector = np.zeros(36, dtype=np.float32)

        for idx, ch in enumerate("abcdefghijklmnopqrstuvwxyz"):
            vector[idx] = counts.get(ch, 0)

        for idx, ch in enumerate("0123456789"):
            vector[26 + idx] = counts.get(ch, 0)

        norm = np.linalg.norm(vector)
        if norm > 0:
            vector = vector / norm
        return vector

    def _max_similarity(self, signature: np.ndarray) -> float:
        if not self._text_signatures:
            return 0.0

        similarities = []
        for existing in self._text_signatures.values():
            similarities.append(float(np.dot(signature, existing)))

        return max(similarities) if similarities else 0.0

    def _feature_tensor(self, text: str, file_size: int, suspicious_hits: int) -> torch.Tensor:
        text_len = len(text)
        digits = sum(ch.isdigit() for ch in text)
        uppercase = sum(ch.isupper() for ch in text)

        digit_ratio = digits / max(text_len, 1)
        upper_ratio = uppercase / max(text_len, 1)
        size_kb = file_size / 1024

        return torch.tensor(
            [
                min(text_len / 4000, 1.0),
                min(digit_ratio * 3.0, 1.0),
                min(upper_ratio * 5.0, 1.0),
                min(suspicious_hits / 4.0, 1.0),
                min(size_kb / 1024, 1.0),
            ],
            dtype=torch.float32,
        )

    def verify(self, file_bytes: bytes) -> VerificationResult:
        fingerprint = hashlib.sha256(file_bytes).hexdigest()
        extracted_text = self._extract_text(file_bytes)
        lowered = extracted_text.lower()

        suspicious_patterns = [word for word in SUSPICIOUS_KEYWORDS if word in lowered]

        text_signature = self._compute_text_signature(extracted_text)
        text_similarity = self._max_similarity(text_signature)

        duplicate_hits = self._fingerprints.get(fingerprint, 0)
        duplicate_probability = min(1.0, 0.45 * duplicate_hits + 0.55 * text_similarity)

        features = self._feature_tensor(extracted_text, len(file_bytes), len(suspicious_patterns))
        fraud_risk_score = float(torch.sigmoid(torch.dot(features, self._weights) + self._bias).item())
        fraud_risk_score = min(1.0, max(fraud_risk_score, duplicate_probability * 0.8))

        if duplicate_probability > 0.75 or fraud_risk_score > 0.72:
            validity = "INVALID"
        elif fraud_risk_score > 0.4:
            validity = "REVIEW_REQUIRED"
        else:
            validity = "VALID"

        if duplicate_hits > 0:
            suspicious_patterns.append("Exact document fingerprint already submitted")
        if text_similarity > 0.92:
            suspicious_patterns.append("High textual overlap with previously uploaded document")
        if len(extracted_text.strip()) < 15:
            suspicious_patterns.append("Low OCR confidence: insufficient readable text")

        self._fingerprints[fingerprint] = duplicate_hits + 1
        self._text_signatures[fingerprint] = text_signature

        return VerificationResult(
            validity=validity,
            fraud_risk_score=round(fraud_risk_score, 4),
            duplicate_probability=round(duplicate_probability, 4),
            extracted_text=extracted_text[:1800],
            suspicious_patterns=suspicious_patterns,
            reference_fingerprint=fingerprint[:24],
        )


verifier = DocumentVerifier()
