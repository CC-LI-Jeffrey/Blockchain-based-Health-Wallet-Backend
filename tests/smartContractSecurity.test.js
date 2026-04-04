const test = require('node:test');
const assert = require('node:assert/strict');
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// Helper to load compiled contract JSON (from Hardhat/Truffle/Remix artifacts)
function loadArtifact(contractName) {
    const artifactPath = path.join(__dirname, '..', 'artifacts', 'contracts', `${contractName}.sol`, `${contractName}.json`);
    if (!fs.existsSync(artifactPath)) {
        throw new Error(`Artifact for ${contractName} not found. Please compile the contract first.`);
    }
    return JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
}

test('Smart Contract Security Tests - HealthWalletV3 Core', async (t) => {
    // Setup a local in-memory provider if possible, or connect to a local node (e.g., Hardhat node on 8545)
    // Note: To run this against a real EVM, you need a local Hardhat/Anvil node running: `npx hardhat node`
    let provider;
    try {
        provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
        // Test connection
        await provider.getNetwork();
    } catch (e) {
        console.log("No local node running on 8545. Please run a local blockchain (like Ganache or Hardhat Node) to execute smart contract tests.");
        return; // Skip tests if no network
    }

    const signers = await provider.listAccounts(); // Get 10 default test accounts
    const ownerInfo = signers[0];
    const userA = signers[1];
    const userB = signers[2];

    const ownerWallet = await provider.getSigner(ownerInfo.address);
    const userAWallet = await provider.getSigner(userA.address);
    const userBWallet = await provider.getSigner(userB.address);

    const artifact = loadArtifact('HealthWalletV3');
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, ownerWallet);
    
    // Deploy a fresh contract for testing
    const contract = await factory.deploy();
    await contract.waitForDeployment();
    const contractAddress = await contract.getAddress();

    const ipfsHash = "QmEncryptedData123";
    const encryptedKey = "AesKey123";
    
    // Enum mappings based on HealthWalletV3
    const RecordType_PERSONAL_INFO = 0;
    const RecordType_MEDICATION = 1;
    const RecipientType_DOCTOR = 0;
    const AccessLevel_FULL_ACCESS = 1;

    await t.test('Setup: Create Personal Info to enable sharing', async () => {
        // User A must set personal info before they can share anything
        const tx = await contract.connect(userAWallet).setPersonalInfo(ipfsHash, encryptedKey);
        await tx.wait();
        
        const hasInfo = await contract.hasPersonalInfo(userA.address);
        assert.equal(hasInfo, true, 'User A should have registered personal info');
        
        // Setup User B: A user MUST register their RSA Public Key before they can properly receive a share.
        // Even though the smart contract might not enforce this deeply at the 'share' function layer, 
        // the client application cannot generate the '_encryptedRecordKey' without pulling this public key first.
        const pubKeyHash = ethers.hexlify(ethers.randomBytes(32));
        const pubKeyTx = await contract.connect(userBWallet).setUserPublicKey("QmRSAKeyIPFSHash", pubKeyHash);
        await pubKeyTx.wait();
        
        // Verify User B's public key is set
        const cryptoProfile = await contract.getUserPublicKey(userB.address);
        assert.equal(cryptoProfile, "QmRSAKeyIPFSHash", "User B should have registered their public key");
    });

    await t.test('1. Role & Ownership Enforcement: Prevent unauthorized sharing of records', async () => {
        const expiryTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
        
        // User B attempts to share User A's Personal Info (Record ID 0 for personal info)
        // Since User B has no personal info set yet, the 'onlyPersonalInfoOwner' modifier will block it immediately
        await assert.rejects(
            contract.connect(userBWallet).shareData(
                ownerInfo.address, ethers.encodeBytes32String("DoctorName"), "QmRecipientHash", 
                RecipientType_DOCTOR, RecordType_PERSONAL_INFO, 0, expiryTime, AccessLevel_FULL_ACCESS, "SharedKey"
            ),
            (err) => {
                return err.message.includes("No info") || err.message.includes("revert");
            },
            'Contract should block users who do not own the info from initiating a share'
        );
    });

    await t.test('2. Business Logic Edge Case: Prevent sharing with self', async () => {
        const expiryTime = Math.floor(Date.now() / 1000) + 3600;
        
        // User A attempts to share with User A
        await assert.rejects(
            contract.connect(userAWallet).shareData(
                userA.address, ethers.encodeBytes32String("Self"), "QmRecipientHash", 
                RecipientType_DOCTOR, RecordType_PERSONAL_INFO, 0, expiryTime, AccessLevel_FULL_ACCESS, "SharedKey"
            ),
            (err) => {
                return err.message.includes("No self-share") || err.message.includes("revert");
            },
            'Contract should explicitly block a user from sharing records with themselves'
        );
    });

    await t.test('3. Business Logic Edge Case: Prevent sharing with past expiry time', async () => {
        const pastExpiryTime = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
        
        await assert.rejects(
            contract.connect(userAWallet).shareData(
                userB.address, ethers.encodeBytes32String("Doctor"), "QmRecipientHash", 
                RecipientType_DOCTOR, RecordType_PERSONAL_INFO, 0, pastExpiryTime, AccessLevel_FULL_ACCESS, "SharedKey"
            ),
            (err) => {
                return err.message.includes("Invalid expiry") || err.message.includes("revert");
            },
            'Contract should block access grants with an expiry in the past'
        );
    });

    let sharedRecordId;

    await t.test('4. Valid Access Grant and Status Check', async () => {
        const expiryTime = Math.floor(Date.now() / 1000) + 3600;
        
        // Grant access
        const grantTx = await contract.connect(userAWallet).shareData(
            userB.address, ethers.encodeBytes32String("Doctor"), "QmRecipientHash", 
            RecipientType_DOCTOR, RecordType_PERSONAL_INFO, 0, expiryTime, AccessLevel_FULL_ACCESS, "SharedKey"
        );
        const receipt = await grantTx.wait();
        
        // Because of exactly how shareCounter works, this should be shareId 1
        sharedRecordId = 1;

        // Verify the share record exists and that access control protects it
        // User A (owner) or User B (recipient) can access this record safely
        const shareRecord = await contract.connect(userAWallet).getShareRecord(sharedRecordId);
        assert.equal(shareRecord.ownerAddress, userA.address, "User A should be the owner");
        assert.equal(shareRecord.recipientAddress, userB.address, "User B should be the recipient");
        assert.equal(shareRecord.status, 0n, "Status should be ACTIVE (Enum 0)"); // 0n is BigInt 0 for ACTIVE mapping
    });

    await t.test('5. Strict Ownership Enforcement: Prevent unauthorized revokation', async () => {
        // User B maliciously tries to revoke the access on User A's share record
        await assert.rejects(
            contract.connect(userBWallet).revokeShare(sharedRecordId),
            (err) => {
                return err.message.includes("Not share owner") || err.message.includes("revert");
            },
            'Contract should block non-owners from revoking access'
        );
    });

    await t.test('6. Emergency Circuit Breaker: Prevent operations when paused', async () => {
        // Only the Admin (Owner) can pause the contract
        const pauseTx = await contract.connect(ownerWallet).pause();
        await pauseTx.wait();

        const expiryTime = Math.floor(Date.now() / 1000) + 3600;

        // Try to perform a valid share operation while paused
        await assert.rejects(
            contract.connect(userAWallet).shareData(
                userB.address, ethers.encodeBytes32String("Doctor"), "QmRecipientHash", 
                RecipientType_DOCTOR, RecordType_PERSONAL_INFO, 0, expiryTime, AccessLevel_FULL_ACCESS, "SharedKey"
            ),
            (err) => {
                return err.message.includes("EnforcedPause") || err.message.includes("Pausable: paused") || err.message.includes("revert");
            },
            'Contract should block sharing attempts when the emergency pause is activated'
        );
        
        // Unpause to leave the contract in a healthy state
        const unpauseTx = await contract.connect(ownerWallet).unpause();
        await unpauseTx.wait();
    });
});
