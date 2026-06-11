import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    console.log("Deploying contract...");
    const artifactPath = path.join(__dirname, "..", "artifacts", "contracts", "KBBFees.sol", "KBBFees.json");
    if (!fs.existsSync(artifactPath)) {
        console.error("Please run 'npx hardhat compile' first.");
        process.exit(1);
    }
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

    const rpcUrl = process.env.BASE_RPC_URL || "https://mainnet.base.org";
    const privateKey = process.env.PRIVATE_KEY;

    if (!privateKey) {
        throw new Error("PRIVATE_KEY not set in .env");
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log("Deploying with account:", wallet.address);

    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
    const contract = await factory.deploy();
    await contract.waitForDeployment();
    
    const address = await contract.getAddress();
    console.log("KBBFees deployed to:", address);

    const contractAddressPath = path.join(__dirname, "..", "contract-address.json");
    fs.writeFileSync(
        contractAddressPath,
        JSON.stringify({ KBBFees: address }, undefined, 2)
    );
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
