/**
 * setupVaccineCircuit.js
 *
 * Run once to compile VaccineVerify circuit and generate all keys.
 * Prerequisites:
 *   npm install -g circom snarkjs
 *   npm install circomlib
 *
 * Usage:
 *   node scripts/setupVaccineCircuit.js
 *
 * Outputs (all placed in circuits/):
 *   VaccineVerify.wasm        → copy to Android: app/src/main/assets/zkp/
 *   VaccineVerify_final.zkey  → copy to Android: app/src/main/assets/zkp/
 *   vaccine_verification_key.json → kept in circuits/ for backend verification
 *   VaccineVerifier.sol       → copy constants into contracts/VaccineVerifyExtension.sol
 *
 * NOTE: Reuses pot12_final.ptau from the AgeVerify setup — no need to redo
 * Powers of Tau if it already exists. VaccineVerify has ~500 constraints,
 * well within 2^12 = 4096.
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
    console.log('  ZKP Vaccine Verification - Circuit Setup');
    console.log('==============================================');

    // Step 1: Compile the circuit
    console.log('\n[1/5] Compiling VaccineVerify.circom...');
    run('.\\circom.exe VaccineVerify.circom --r1cs --wasm --sym');
    console.log('✅ Circuit compiled');

    // Step 2: Powers of Tau — reuse existing pot12_final.ptau if available
    const ptauPath = path.join(CIRCUITS_DIR, 'pot12_final.ptau');
    if (fs.existsSync(ptauPath)) {
        console.log('\n[2/5] Reusing existing pot12_final.ptau (from AgeVerify setup)');
        console.log('✅ Powers of Tau skipped');
    } else {
        console.log('\n[2/5] Starting Powers of Tau ceremony (Phase 1)...');
        run('snarkjs powersoftau new bn128 12 pot12_0000.ptau -v');
        run('snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau --name="VaccineVerify setup" -e="blockchain health wallet vaccine zkp entropy"');
        run('snarkjs powersoftau prepare phase2 pot12_0001.ptau pot12_final.ptau -v');
        console.log('✅ Powers of Tau completed');
    }

    // Step 3: Phase 2 setup (circuit-specific)
    console.log('\n[3/5] Phase 2 setup (circuit-specific keys)...');
    run('snarkjs groth16 setup VaccineVerify.r1cs pot12_final.ptau VaccineVerify_0000.zkey');
    run('snarkjs zkey contribute VaccineVerify_0000.zkey VaccineVerify_final.zkey --name="VaccinePhase2" -e="health wallet vaccine phase2 entropy"');
    console.log('✅ ZKey generated');

    // Step 4: Export verification key
    console.log('\n[4/5] Exporting verification key...');
    run('snarkjs zkey export verificationkey VaccineVerify_final.zkey vaccine_verification_key.json');
    console.log('✅ vaccine_verification_key.json created');

    // Step 5: Copy circuit files for Android
    console.log('\n[5/5] Copying circuit files for Android...');
    const wasm = path.join(CIRCUITS_DIR, 'VaccineVerify_js', 'VaccineVerify.wasm');
    const zkey = path.join(CIRCUITS_DIR, 'VaccineVerify_final.zkey');

    if (fs.existsSync(wasm)) {
        const wasmSize = (fs.statSync(wasm).size / 1024).toFixed(1);
        console.log(`✅ VaccineVerify.wasm  (${wasmSize} KB)`);
        console.log(`   → Copy to: BlockchainHealthWallet/app/src/main/assets/zkp/VaccineVerify.wasm`);
    } else {
        console.warn('⚠️  VaccineVerify.wasm not found — check compilation step');
    }

    if (fs.existsSync(zkey)) {
        const zkeySize = (fs.statSync(zkey).size / 1024).toFixed(1);
        console.log(`✅ VaccineVerify_final.zkey  (${zkeySize} KB)`);
        console.log(`   → Copy to: BlockchainHealthWallet/app/src/main/assets/zkp/VaccineVerify_final.zkey`);
    } else {
        console.warn('⚠️  VaccineVerify_final.zkey not found — check zkey steps');
    }

    console.log('\n==============================================');
    console.log('  Setup complete! Next steps:');
    console.log('==============================================');
    console.log('1. Copy the two asset files listed above into the Android assets folder');
}

main().catch(e => {
    console.error('Setup failed:', e);
    process.exit(1);
});
