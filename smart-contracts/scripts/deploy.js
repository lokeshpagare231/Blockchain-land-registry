const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const Registry = await hre.ethers.getContractFactory("PropertyRegistry");
  const registry = await Registry.deploy();
  await registry.waitForDeployment();

  const address = await registry.getAddress();
  const network = await hre.ethers.provider.getNetwork();
  const artifact = await hre.artifacts.readArtifact("PropertyRegistry");

  const deployment = {
    network: hre.network.name,
    chainId: network.chainId.toString(),
    deployedAt: new Date().toISOString(),
    contractAddress: address,
    deployer: deployer.address,
    abi: artifact.abi
  };

  const outDir = path.resolve(__dirname, "..", "..", "blockchain-scripts");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outFile = path.join(outDir, "deployment.local.json");
  fs.writeFileSync(outFile, JSON.stringify(deployment, null, 2));

  console.log("PropertyRegistry deployed at:", address);
  console.log("Deployment written to:", outFile);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
