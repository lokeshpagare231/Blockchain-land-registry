const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying CrossChainAnchor with:", deployer.address);

  const Anchor = await hre.ethers.getContractFactory("CrossChainAnchor");
  const anchor = await Anchor.deploy();
  await anchor.waitForDeployment();

  const address = await anchor.getAddress();
  console.log("CrossChainAnchor deployed at:", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
