/**
 * setupCircuit.js
 *
 * Run this ONCE to compile the AgeVerify circuit and generate all keys.
 * Prerequisites:
 *   npm install -g circom snarkjs
 *   npm install circomlib
 *
 * Usage:
 *   node scripts/setupCircuit.js
 *
 * Outputs (all placed in circuits/):
 *   AgeVerify.wasm        → copy to Android: app/src/main/assets/zkp/
 *   AgeVerify_final.zkey  → copy to Android: app/src/main/assets/zkp/
 *   verification_key.json → used by backend zkpService.js
 *   AgeVerifier.sol       → copy to contracts/
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CIRCUITS_DIR = path.join(__dirname, '..', 'circuits');
const CONTRACTS_DIR = path.join(__dirname, '..', 'contracts');

function run(cmd, cwd = CIRCUITS_DIR) {
    console.log(`\n▶ ${cmd}`);
    execSync(cmd, { stdio: 'inherit', cwd });
}

async function main() {
    console.log('==============================================');
    console.log('  ZKP Age Verification - Circuit Setup');
    console.log('==============================================');

    // Step 1: Compile the circuit
    console.log('\n[1/6] Compiling AgeVerify.circom...');
    run('.\\circom.exe AgeVerify.circom --r1cs --wasm --sym');
    console.log('✅ Circuit compiled');

    // Step 2: Powers of Tau (Phase 1) — use 2^12 = 4096 constraints max (enough for this circuit)
    console.log('\n[2/6] Starting Powers of Tau ceremony (Phase 1)...');
    run('snarkjs powersoftau new bn128 12 pot12_0000.ptau -v');
    run('snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau --name="AgeVerify setup" -e="blockchain health wallet zkp entropy"');
    run('snarkjs powersoftau prepare phase2 pot12_0001.ptau pot12_final.ptau -v');
    console.log('✅ Powers of Tau completed');

    // Step 3: Phase 2 setup (circuit-specific)
    console.log('\n[3/6] Phase 2 setup (circuit-specific keys)...');
    run('snarkjs groth16 setup AgeVerify.r1cs pot12_final.ptau AgeVerify_0000.zkey');
    run('snarkjs zkey contribute AgeVerify_0000.zkey AgeVerify_final.zkey --name="Phase2" -e="health wallet phase2 entropy"');
    console.log('✅ ZKey generated');

    // Step 4: Export verification key
    console.log('\n[4/6] Exporting verification key...');
    run('snarkjs zkey export verificationkey AgeVerify_final.zkey verification_key.json');
    console.log('✅ verification_key.json created');

    // Step 5: Export Solidity verifier
    console.log('\n[5/6] Generating Solidity verifier contract...');
    run('snarkjs zkey export solidityverifier AgeVerify_final.zkey AgeVerifier.sol');
    // Move to contracts/
    const srcVerifier = path.join(CIRCUITS_DIR, 'AgeVerifier.sol');
    const dstVerifier = path.join(CONTRACTS_DIR, 'AgeVerifier.sol');
    if (fs.existsSync(srcVerifier)) {
        fs.copyFileSync(srcVerifier, dstVerifier);
        console.log(`✅ AgeVerifier.sol → contracts/AgeVerifier.sol`);
    }

    // Step 6: Copy circuit files for Android
    console.log('\n[6/6] Copying circuit files...');
    const wasm = path.join(CIRCUITS_DIR, 'AgeVerify_js', 'AgeVerify.wasm');
    const zkey = path.join(CIRCUITS_DIR, 'AgeVerify_final.zkey');

    if (fs.existsSync(wasm)) {
        const wasmSize = (fs.statSync(wasm).size / 1024).toFixed(1);
        console.log(`✅ AgeVerify.wasm  (${wasmSize} KB)`);
        console.log(`   → Copy to: BlockchainHealthWallet/app/src/main/assets/zkp/AgeVerify.wasm`);
    }

    if (fs.existsSync(zkey)) {
        const zkeySize = (fs.statSync(zkey).size / 1024).toFixed(1);
        console.log(`✅ AgeVerify_final.zkey  (${zkeySize} KB)`);
        console.log(`   → Copy to: BlockchainHealthWallet/app/src/main/assets/zkp/AgeVerify_final.zkey`);
    }

    console.log('\n==============================================');
    console.log('  Setup complete!');
    console.log('==============================================');
    console.log('\nNext steps:');
    console.log('1. Copy AgeVerify.wasm   → Android assets/zkp/');
    console.log('2. Copy AgeVerify_final.zkey → Android assets/zkp/');
    console.log('3. Deploy AgeVerifier.sol + AgeVerifyExtension.sol to Sepolia');
    console.log('4. Update AGE_VERIFY_CONTRACT in BlockchainService.kt');
    console.log('');
}

main().catch(err => {
    console.error('Setup failed:', err.message);
    process.exit(1);
});
