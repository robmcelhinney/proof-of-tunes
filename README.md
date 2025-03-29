# 🎧 Proof of Tunes

**Zero-Knowledge Verified Spotify Listening Badges.**

Proof of Tunes lets users cryptographically prove their top Spotify artists — without revealing any personal data. Using zero-knowledge proofs (ZKPs), listeners can mint unique NFTs that attest to their musical taste, verified but private.

---

## 🛠️ Tech Stack

-   🟩 **Circom + snarkjs** — ZK circuit + proof generation
-   🎧 **Spotify OAuth** — for top artist data (via `user-top-read`)
-   🦄 **Hardhat + Solidity** — on-chain NFT minting and verification
-   ⚛️ **React + Tailwind** — clean frontend with animated confetti
-   🔐 **Backend signer** — signs user data before proof generation to prevent spoofing

---

## 🔐 How It Works

1. **Login with Spotify** — via the backend, not client-side
2. **Fetch top 3 artists** — using your long-term Spotify stats
3. **Backend signs the artist names** — proves data is genuine
4. **Generate ZK Proof** — circuit verifies hashes match signed names
5. **Mint NFT** — circuit proof + signed data sent to smart contract
6. **Celebrate** — Confetti, metadata, and a shiny new badge

---

## 🧠 Zero-Knowledge Circuit

Located in [`top_artists.circom`](./circuits/top_artists.circom), the circuit proves you know the plaintext of 3 artist names whose hashes match public inputs, without revealing the names during proof generation.

---

## 🎨 NFT Metadata

Each NFT includes:

-   Top 3 Artist Names (public)
-   Timestamped month/year of mint
-   SVG badge image (base64 in `tokenURI`)
-   Fully on-chain verification of proof + signature

---

## 🔒 Security Notes

-   ZK proof is tied to a backend-signed payload
-   Users cannot spoof DOM data or modify artist names
-   Private keys, Spotify secrets, and witness generation are all done server-side or via signed sessions

> Never expose your `.env` or `zkey` files in production. Use a secure trusted setup or ceremony.

---

## 🧪 Local Dev

```bash
# 1. Install dependencies
npm install

# 2. Start backend (OAuth + data signer)
cd backend
node index.js

# 3. Start frontend
cd frontend
npm start

# 4. Generate proof artifacts
cd circuits
# compile .circom, create .zkey, etc.
```

---

## 📦 Deploy

Smart contracts use Hardhat + OpenZeppelin and support:

-   Local hardhat network
-   Any EVM chain (Sepolia, Base, etc.)

---

## 📜 License

MIT

---

## 🌐 Live Demo

Coming soon — or run locally at http://localhost:3000
