import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const KBBFees = await hre.ethers.getContractFactory("KBBFees");
  const feeContract = await KBBFees.deploy();

  await feeContract.waitForDeployment();
  const address = await feeContract.getAddress();

  console.log("KBBFees deployed to:", address);

  const contractAddressPath = path.join(__dirname, "..", "contract-address.json");
  fs.writeFileSync(
    contractAddressPath,
    JSON.stringify({ KBBFees: address }, undefined, 2)
  );

  const artifactsDir = path.join(__dirname, "..", "src", "artifacts");
  if (!fs.existsSync(artifactsDir)) {
      fs.mkdirSync(artifactsDir, { recursive: true });
  }

  const KBBFeesArtifact = path.join(__dirname, "..", "artifacts", "contracts", "KBBFees.sol", "KBBFees.json");
  if(fs.existsSync(KBBFeesArtifact)) {
      fs.copyFileSync(KBBFeesArtifact, path.join(artifactsDir, "KBBFees.json"));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
