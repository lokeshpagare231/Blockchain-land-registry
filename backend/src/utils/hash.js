import crypto from "crypto";

export function sha256(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

export function computeMerkleRoot(leaves) {
  if (!leaves || leaves.length === 0) {
    return sha256("empty");
  }

  let level = leaves.map((leaf) => sha256(leaf));

  while (level.length > 1) {
    const next = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = level[i + 1] || left;
      next.push(sha256(`${left}${right}`));
    }
    level = next;
  }

  return level[0];
}

export function nowIso() {
  return new Date().toISOString();
}
