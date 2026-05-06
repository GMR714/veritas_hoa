# Veritas Village HOA System

An on-chain Homeowners Association (HOA) management platform for Veritas Village combining blockchain governance, treasury management, and community modules (chat, finances, marketplace, etc.).

## Run & Operate

- **Start**: `npm start` (runs `node backend/server.js`)
- **Port**: 5000 (0.0.0.0)
- **Required env vars**: `JWT_SECRET`, `RPC_URL`, `NFT_ADDRESS`, `ADMIN_ADDRESS`, `PRIVATE_KEY` (optional — defaults provided for testnet)

## Stack

- **Runtime**: Node.js v20
- **Backend**: Express.js, SQLite via `better-sqlite3`
- **Frontend**: Vanilla JS + Three.js (3D background), Ethers.js v6 (Web3)
- **Blockchain**: Rootstock (RSK) Testnet (Chain ID 31), Solidity 0.8.20 + OpenZeppelin v5
- **Auth**: JWT + EIP-191 message signing
- **Smart Contracts**: Hardhat

## Where things live

- `backend/server.js` — Express API server (also serves frontend as static files)
- `backend/database.js` — SQLite schema + prepared statements
- `backend/mock-data.js` — Seed data seeded on startup
- `frontend/` — Static HTML/CSS/JS frontend
- `frontend/js/config.js` — API URL and contract addresses
- `frontend/js/modules/` — Feature modules (chat, finances, solar, water, etc.)
- `contracts/` — Solidity smart contracts
- `scripts/` — Deployment & interaction scripts

## Architecture decisions

- Server serves both frontend (static) and API from a single Express process on port 5000
- SQLite is used for off-chain state (governance votes, chat, finances); on-chain state lives on RSK Testnet
- Frontend uses relative `/api` URL so it works across all environments (dev, prod, proxied)
- `better-sqlite3` requires native compilation — must run `npm rebuild better-sqlite3` in new environments
- Mock data is seeded automatically on startup if tables are empty

## Product

- **Governance**: Quadratic voting on ideas that auto-promote to on-chain proposals
- **Chat**: Multi-channel community messaging
- **Finances**: HOA dues tracking, payment status, transaction history
- **Marketplace**: Buy/sell listings among residents
- **Solar & Water**: Monitoring dashboards for community energy/water usage
- **Security**: Guest management with QR code passes
- **Announcements & Events**: Community calendar and announcements

## User preferences

_Populate as you build_

## Gotchas

- `better-sqlite3` is a native module — always run `npm rebuild better-sqlite3` after environment changes
- Three.js WebGL context will fail in the Replit preview (no GPU) — this is cosmetic; the app still works
- Backend connects to RSK Testnet on startup to fetch the admin address from the NFT contract

## Pointers

- RSK Testnet Explorer: https://explorer.testnet.rootstock.io
- WalletConnect Project ID configured in `frontend/js/config.js`
