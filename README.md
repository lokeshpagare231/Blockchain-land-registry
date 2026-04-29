# Blockchain-Based Land Registry System with AI Verification & Blockchain Visualization Dashboard

End-to-end prototype for decentralized land registration, ownership transfer, AI document verification, IPFS document hashing, and live blockchain process visualization.

## Highlights

- Smart contract based property registry (`register`, `transfer`, `inherit`, `mutate`)
- Immutable ownership history with on-chain event logs
- Real Ethereum transactions on local Hardhat/Ganache networks
- IPFS document upload with blockchain hash anchoring
- AI verification microservice (OCR + fraud/duplicate scoring)
- Interactive dashboard with:
  - Transaction timeline animation
  - Node broadcast visualization
  - Merkle tree view
  - Block hash/previous hash linkage
  - Mini blockchain explorer
  - Network status monitor

## Architecture

User Interface Layer (Next.js + React + Tailwind + D3 + Chart.js)
-> Backend Layer (Express + Socket.IO)
-> Blockchain Interaction Layer (Ethers.js service)
-> Ethereum Local Network (Hardhat / Ganache)
-> IPFS Storage Layer (ipfs-http-client / fallback)
-> AI Verification Engine (FastAPI + Tesseract OCR + PyTorch)

## Project Structure

- `frontend/` - Next.js visualization dashboard
- `backend/` - Express API + blockchain interaction + IPFS/AI integration
- `smart-contracts/` - Solidity + Hardhat deployment scripts
- `ai-service/` - FastAPI OCR + fraud scoring microservice
- `ipfs-service/` - Optional dedicated IPFS upload service
- `blockchain-scripts/` - event watch + chain inspection utilities

## Core Smart Contract Functions

- `registerProperty(propertyId, surveyNumber, geoCoordinates, ownerWalletAddress, documentHash)`
- `transferOwnership(propertyId, newOwner, newDocumentHash)`
- `inheritProperty(propertyId, beneficiary, inheritanceDocumentHash)`
- `mutateProperty(propertyId, updatedDocumentHash)`
- `getPropertyHistory(propertyId)`
- `verifyOwnership(propertyId, claimant)`

## Setup

## 1) Install all dependencies

```bash
npm run install:all
```

Install Python dependencies for AI service:

```bash
cd ai-service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

## 2) Configure environment files

Copy each example file and set values if needed:

- `smart-contracts/.env.example`
- `backend/.env.example`
- `frontend/.env.example`
- `ipfs-service/.env.example`
- `ai-service/.env.example`

Default settings run fully local (`localhost`).

## 3) Start local blockchain

```bash
npm run blockchain:node
```

Keep this terminal running.

## 4) Deploy smart contract

Open a new terminal:

```bash
npm run blockchain:deploy
```

This writes `blockchain-scripts/deployment.local.json` containing contract address + ABI.

(Optional) seed sample data:

```bash
npm run blockchain:seed
```

## 5) Start backend, frontend, AI, and IPFS services

Terminal A:

```bash
npm run backend:dev
```

Terminal B:

```bash
npm run frontend:dev
```

Terminal C:

```bash
cd ai-service
.venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
```

Terminal D (optional standalone IPFS service):

```bash
npm run ipfs:dev
```

Open dashboard at `http://localhost:3000`.

## Dashboard Pages

- `/` - Home Dashboard
- `/property-registry` - Property registration and ownership operations
- `/blockchain-simulator` - Step-by-step blockchain process simulation
- `/blockchain-explorer` - Blocks, transactions, and contract events
- `/ai-verification` - OCR + fraud scoring
- `/network-status` - node and service health

## API Summary (Backend)

- `POST /api/documents/upload`
- `POST /api/properties/register`
- `POST /api/properties/transfer`
- `POST /api/properties/inherit`
- `POST /api/properties/mutate`
- `GET /api/properties/search`
- `GET /api/properties/:propertyId`
- `GET /api/properties/:propertyId/history`
- `GET /api/properties/:propertyId/verify/:walletAddress`
- `GET /api/explorer/blocks`
- `GET /api/explorer/blocks/:number`
- `GET /api/explorer/transactions/:hash`
- `GET /api/explorer/events`
- `GET /api/explorer/integrity`
- `GET /api/network/status`

## Visualization Workflow Covered

1. Transaction created
2. Transaction broadcast to nodes
3. Node validation
4. Block construction
5. Merkle root generation
6. SHA256 block hash generation
7. Previous hash linking
8. Ledger update and ownership state change

## Security Concepts Demonstrated

- Wallet-based signatures for state-changing transactions
- Ownership checks in smart contract modifiers
- On-chain immutability via block linkage
- Tamper detection indicator (`Chain integrity broken`)
- Off-chain document storage with on-chain hash anchoring

## Optional GIS Extension

A GIS layer (Leaflet/Mapbox) can be added by mapping `geoCoordinates` from each property to markers and overlaying history from `getPropertyHistory`.

## Insider Threat Security Monitoring (New)

The system now includes AI-driven insider threat detection with sequence modeling:

- Behavior logging for login, registration, transfer approvals, document uploads/overrides, smart contract execution, node interactions, and admin actions.
- Sequence-based anomaly scoring (LSTM + heuristic fusion) in `backend/security/threat_detection_service.py`.
- Risk scoring and alert generation (`NORMAL`, `SUSPICIOUS`, `HIGH`) via backend risk engine.
- Security APIs:
  - `GET /api/security/logs`
  - `GET /api/security/risk-scores`
  - `GET /api/security/alerts`
  - `GET /api/security/analytics`
  - `POST /api/security/analyze-user`
- Frontend Security Monitoring dashboard: `/security-monitoring` with live logs, threat alerts, risk charts, and behavior timeline (polling every 5 seconds).

### Optional MongoDB Storage

Set `MONGO_URI` in `backend/.env` to store behavior logs, risk scores, and alerts in MongoDB.
If unset, local JSON fallback storage is used under `backend/storage/security`.
