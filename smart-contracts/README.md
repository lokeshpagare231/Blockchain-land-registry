# Smart Contracts Module

Hardhat module for local Ethereum deployment of `PropertyRegistry`.

## Commands

```bash
npm install
npm run compile
npm run node
npm run deploy
npm run seed
```

`deploy` writes shared deployment metadata to:

- `../blockchain-scripts/deployment.local.json`

This file is consumed by backend and scripts for ABI + address.
