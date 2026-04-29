# IPFS Service

Standalone document upload service for land registry documents.

## Run

```bash
npm install
npm run dev
```

## APIs

- `GET /health`
- `POST /upload` (`multipart/form-data`, field: `file`)

It attempts IPFS upload via `ipfs-http-client`, and falls back to local storage if IPFS is offline.
