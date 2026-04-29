import json
import math
import sys
from datetime import datetime
from typing import Dict, List

import numpy as np

try:
    import torch
    import torch.nn as nn
except Exception:  # pragma: no cover
    torch = None
    nn = None


ACTION_VOCAB = {
    "user_login": 1,
    "property_registration": 2,
    "property_transfer_approval": 3,
    "document_upload": 4,
    "document_override": 5,
    "smart_contract_execution": 6,
    "blockchain_node_interaction": 7,
    "admin_action": 8,
    "sensitive_record_access": 9,
    "unknown_action": 10,
}


class BehaviorLSTMScorer(nn.Module):
    def __init__(self, vocab_size: int = 32, embed_dim: int = 8, hidden_dim: int = 12):
        super().__init__()
        self.embedding = nn.Embedding(vocab_size, embed_dim)
        self.lstm = nn.LSTM(embed_dim + 5, hidden_dim, batch_first=True)
        self.head = nn.Linear(hidden_dim, 1)

    def forward(self, action_ids: torch.Tensor, dense_features: torch.Tensor) -> torch.Tensor:
        emb = self.embedding(action_ids)
        x = torch.cat([emb, dense_features], dim=-1)
        out, _ = self.lstm(x)
        last = out[:, -1, :]
        return torch.sigmoid(self.head(last))


def parse_timestamp(value: str):
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except Exception:
        return None


def action_id(action: str) -> int:
    return ACTION_VOCAB.get(action, ACTION_VOCAB["unknown_action"])


def is_off_hours(ts: datetime) -> int:
    if ts is None:
        return 0
    return int(ts.hour < 8 or ts.hour > 20)


def dense_vector(current_log: Dict, prev_log: Dict, wallet_reuse_ratio: float) -> List[float]:
    current_ts = parse_timestamp(current_log.get("timestamp", ""))
    prev_ts = parse_timestamp(prev_log.get("timestamp", "")) if prev_log else None

    if current_ts and prev_ts:
        delta_seconds = abs((current_ts - prev_ts).total_seconds())
    else:
        delta_seconds = 600

    rapid_action = 1.0 if delta_seconds < 45 else 0.0
    override_action = 1.0 if current_log.get("action") == "document_override" else 0.0
    transfer_action = 1.0 if current_log.get("action") in ["property_transfer_approval", "approve_transfer"] else 0.0
    off_hours = float(is_off_hours(current_ts))

    return [
        min(delta_seconds / 600.0, 1.0),
        rapid_action,
        override_action,
        transfer_action,
        min(wallet_reuse_ratio, 1.0),
    ]


def wallet_reuse(logs: List[Dict]) -> float:
    wallets = [item.get("wallet_address") for item in logs if item.get("wallet_address")]
    if not wallets:
        return 0.0
    top_count = max(wallets.count(wallet) for wallet in set(wallets))
    return top_count / max(len(wallets), 1)


def heuristic_score(logs: List[Dict], current_action: str) -> (float, Dict):
    sorted_logs = sorted(logs, key=lambda item: item.get("timestamp", ""))
    rapid_count = 0
    transfer_count = 0
    override_count = 0
    offhour_count = 0

    for idx, item in enumerate(sorted_logs):
        action = item.get("action", "")
        if action in ["property_transfer_approval", "approve_transfer", "transfer_property"]:
            transfer_count += 1
        if action == "document_override":
            override_count += 1

        ts = parse_timestamp(item.get("timestamp", ""))
        if is_off_hours(ts):
            offhour_count += 1

        if idx > 0:
            prev = parse_timestamp(sorted_logs[idx - 1].get("timestamp", ""))
            curr = ts
            if prev and curr and abs((curr - prev).total_seconds()) < 45:
                rapid_count += 1

    repeated_wallet_ratio = wallet_reuse(sorted_logs)

    score = 0.12
    score += min(0.32, transfer_count * 0.05)
    score += min(0.2, rapid_count * 0.04)
    score += min(0.2, override_count * 0.08)
    score += min(0.08, offhour_count * 0.02)
    score += min(0.22, repeated_wallet_ratio * 0.22)

    if current_action == "property_transfer_approval":
        score += 0.04

    return min(1.0, max(0.0, score)), {
        "rapid_actions": rapid_count,
        "transfer_actions": transfer_count,
        "override_actions": override_count,
        "offhour_actions": offhour_count,
        "repeated_wallet_ratio": round(repeated_wallet_ratio, 4),
    }


def lstm_sequence_score(logs: List[Dict]) -> float:
    if not logs or torch is None:
        return 0.0

    torch.manual_seed(77)
    np.random.seed(77)

    scorer = BehaviorLSTMScorer()
    scorer.eval()

    window = sorted(logs, key=lambda item: item.get("timestamp", ""))[-40:]
    reuse_ratio = wallet_reuse(window)

    action_tensor = []
    dense_tensor = []

    for index, item in enumerate(window):
        prev = window[index - 1] if index > 0 else None
        action_tensor.append(action_id(item.get("action", "unknown_action")))
        dense_tensor.append(dense_vector(item, prev, reuse_ratio))

    actions = torch.tensor([action_tensor], dtype=torch.long)
    dense = torch.tensor([dense_tensor], dtype=torch.float32)

    with torch.no_grad():
        prediction = scorer(actions, dense).item()

    return float(prediction)


def analyze(payload: Dict) -> Dict:
    logs = payload.get("logs", [])
    user_id = payload.get("user_id", "unknown_user")
    current_action = payload.get("action", "unknown_action")

    heuristic, signals = heuristic_score(logs, current_action)
    lstm_score = lstm_sequence_score(logs)

    risk_score = min(1.0, max(0.0, 0.55 * heuristic + 0.45 * lstm_score))

    if risk_score >= 0.6:
        threat_level = "HIGH"
        reason = "Unusual transfer frequency and sequence anomalies"
    elif risk_score >= 0.3:
        threat_level = "SUSPICIOUS"
        reason = "Behavior sequence deviates from baseline pattern"
    else:
        threat_level = "NORMAL"
        reason = "Behavior aligns with normal operational flow"

    return {
        "user_id": user_id,
        "risk_score": round(risk_score, 4),
        "threat_level": threat_level,
        "reason": reason,
        "sequence_length": len(logs),
        "model": "lstm_sequence_anomaly_v1",
        "signals": {
            **signals,
            "lstm_score": round(lstm_score, 4),
            "heuristic_score": round(heuristic, 4),
            "current_action": current_action,
        },
    }


def main():
    raw = sys.stdin.read().strip()
    if not raw:
        print(json.dumps({"error": "Missing payload"}))
        sys.exit(1)

    try:
        payload = json.loads(raw)
    except json.JSONDecodeError as exc:
        print(json.dumps({"error": f"Invalid JSON: {str(exc)}"}))
        sys.exit(1)

    result = analyze(payload)
    print(json.dumps(result))


if __name__ == "__main__":
    main()
