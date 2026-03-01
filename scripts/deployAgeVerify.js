/**
 * deployAgeVerify.js
 *
 * Deploys AgeVerifier.sol (auto-generated) + AgeVerifyExtension.sol to Sepolia.
 *
 * Prerequisites:
 *   1. Run node scripts/setupCircuit.js  (generates AgeVerifier.sol)
 *   2. npx hardhat compile
 *   3. Set PRIVATE_KEY in .env
 *
 * Usage:
 *   npx hardhat run scripts/deployAgeVerify.js --network sepolia
 */

const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with:", deployer.address);
    console.log("Balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");

    // Step 1: Deploy AgeVerifier (auto-generated from snarkjs)
    console.log("\n[1/2] Deploying AgeVerifier.sol...");
    const AgeVerifier = await ethers.getContractFactory("AgeVerifier");
    const verifier = await AgeVerifier.deploy();
    await verifier.waitForDeployment();
    const verifierAddress = await verifier.getAddress();
    console.log("✅ AgeVerifier deployed to:", verifierAddress);

    // Step 2: Deploy AgeVerifyExtension with verifier address
    console.log("\n[2/2] Deploying AgeVerifyExtension.sol...");
    const AgeVerifyExtension = await ethers.getContractFactory("AgeVerifyExtension");
    const extension = await AgeVerifyExtension.deploy(verifierAddress);
    await extension.waitForDeployment();
    const extensionAddress = await extension.getAddress();
    console.log("✅ AgeVerifyExtension deployed to:", extensionAddress);

    console.log("\n==============================================");
    console.log("UPDATE BlockchainService.kt:");
    console.log(`  private const val AGE_VERIFY_CONTRACT = "${extensionAddress}"`);
    console.log("==============================================");

    // Verify on Etherscan
    console.log("\nVerify on Etherscan:");
    console.log(`  npx hardhat verify --network sepolia ${verifierAddress}`);
    console.log(`  npx hardhat verify --network sepolia ${extensionAddress} ${verifierAddress}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
