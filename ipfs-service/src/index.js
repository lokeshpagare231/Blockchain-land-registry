import fs from "fs";
import path from "path";
import crypto from "crypto";
import express from "express";
import cors from "cors";
import multer from "multer";
import dotenv from "dotenv";
import { create as createIpfsClient } from "ipfs-http-client";

dotenv.config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const port = Number(process.env.PORT || 5005);
const ipfsUrl = process.env.IPFS_URL || "http://127.0.0.1:5001/api/v0";
const storageDir = path.resolve("storage");

let ipfs;

function ensureLocalStorage() {
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }
}

function hashBuffer(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function getClient() {
  if (!ipfs) {
    ipfs = createIpfsClient({ url: ipfsUrl });
  }
  return ipfs;
}

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "online", service: "ipfs-service", ipfsUrl });
});

app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "file is required" });
      return;
    }

    try {
      const client = getClient();
      const result = await client.add(req.file.buffer, { pin: true, cidVersion: 1 });

      res.json({
        storageType: "ipfs",
        hash: result.cid.toString(),
        filename: req.file.originalname
      });
    } catch (ipfsError) {
      ensureLocalStorage();
      const hash = hashBuffer(req.file.buffer);
      const target = path.join(storageDir, `${hash}-${req.file.originalname}`);
      fs.writeFileSync(target, req.file.buffer);

      res.json({
        storageType: "local-fallback",
        hash: `local-${hash}`,
        filename: req.file.originalname,
        warning: ipfsError.message
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`IPFS service listening at http://localhost:${port}`);
});
