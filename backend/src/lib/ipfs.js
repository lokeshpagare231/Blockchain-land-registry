import fs from "fs";
import path from "path";
import { create as createIpfsClient } from "ipfs-http-client";
import { config } from "../config.js";
import { sha256 } from "../utils/hash.js";

let client;

function getClient() {
  if (!client) {
    client = createIpfsClient({ url: config.ipfsUrl });
  }
  return client;
}

function ensureStorageDir() {
  if (!fs.existsSync(config.storageDir)) {
    fs.mkdirSync(config.storageDir, { recursive: true });
  }
}

export async function uploadDocumentToIpfs(file) {
  if (!file) {
    throw new Error("File is required for IPFS upload");
  }

  try {
    const ipfs = getClient();
    const result = await ipfs.add(file.buffer, {
      pin: true,
      cidVersion: 1
    });

    return {
      ipfsHash: result.cid.toString(),
      storageType: "ipfs"
    };
  } catch (error) {
    ensureStorageDir();
    const fileHash = sha256(file.buffer);
    const extension = path.extname(file.originalname || "") || ".bin";
    const filename = `${fileHash}${extension}`;
    const targetPath = path.join(config.storageDir, filename);

    fs.writeFileSync(targetPath, file.buffer);

    return {
      ipfsHash: `local-${fileHash}`,
      storageType: "local-fallback",
      localPath: targetPath,
      warning: `IPFS unavailable, stored locally. ${error.message}`
    };
  }
}
