const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

function loadDeployment() {
  const file = path.resolve(__dirname, "..", "..", "blockchain-scripts", "deployment.local.json");
  if (!fs.existsSync(file)) {
    throw new Error("deployment.local.json not found. Run npm run deploy first.");
  }
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

async function main() {
  const deployment = loadDeployment();
  const [registrar, ownerA, ownerB] = await hre.ethers.getSigners();

  const registry = await hre.ethers.getContractAt("PropertyRegistry", deployment.contractAddress, registrar);

  const tx = await registry.registerProperty(
    1001,
    "SURVEY-001",
    "18.5204,73.8567",
    ownerA.address,
    "QmSeedDocumentHash001"
  );
  await tx.wait();
  console.log("Seed registration tx:", tx.hash);

  const saleTx = await registry.connect(ownerA).transferOwnership(1001, ownerB.address, "QmSaleDocHash001");
  await saleTx.wait();
  console.log("Seed transfer tx:", saleTx.hash);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
