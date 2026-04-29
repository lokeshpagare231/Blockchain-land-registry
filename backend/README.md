# Backend Module

Express API server for land registry operations, blockchain interaction, explorer endpoints, IPFS upload, AI verification, and insider-threat security monitoring.

## Run

```bash
npm install
npm run dev
```

Requires deployed contract metadata in `../blockchain-scripts/deployment.local.json`.

## Security Monitoring Layer

Security modules are in:

- `../security/behavior_logger.js`
- `../security/risk_engine.js`
- `../security/threat_detection_service.py`

### Security APIs

- `GET /api/security/logs`
- `GET /api/security/risk-scores`
- `GET /api/security/alerts`
- `GET /api/security/analytics`
- `POST /api/security/analyze-user`
- `POST /api/security/log-action`

Behavior actions are logged for key workflows (registration, transfer approvals, document upload/override, smart contract execution, blockchain interactions, and admin actions).

## WebSocket Events

- `simulation-step` - emits each blockchain process stage
- `contract-event` - emits smart contract event payloads
