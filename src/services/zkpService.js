const path = require('path');
const fs = require('fs');

/**
 * ZKP Service
 * Handles off-chain verification of Groth16 age proofs via snarkjs.
 * Proof generation always happens CLIENT-SIDE (Android app).
 * This service only verifies proofs before the user submits on-chain (saves gas).
 */
class ZkpService {
    constructor() {
        this.circuitsDir = path.join(__dirname, '../../circuits');
        this.vkeyPath = path.join(this.circuitsDir, 'verification_key.json');
        this.wasmPath = path.join(this.circuitsDir, 'AgeVerify_js', 'AgeVerify.wasm');
        this.zkeyPath = path.join(this.circuitsDir, 'AgeVerify_final.zkey');
        this._vkey = null;
        this._snarkjs = null;
    }

    /**
     * Lazy-load snarkjs (heavy library, load only when needed)
     */
    async getSnarkjs() {
        if (!this._snarkjs) {
            this._snarkjs = require('snarkjs');
        }
        return this._snarkjs;
    }

    /**
     * Lazy-load verification key
     */
    getVkey() {
        if (!this._vkey) {
            if (!fs.existsSync(this.vkeyPath)) {
                throw new Error(
                    'verification_key.json not found. Run: node scripts/setupCircuit.js'
                );
            }
            this._vkey = JSON.parse(fs.readFileSync(this.vkeyPath, 'utf8'));
        }
        return this._vkey;
    }

    /**
     * Check if circuit files are ready
     */
    isCircuitReady() {
        return (
            fs.existsSync(this.vkeyPath) &&
            fs.existsSync(this.wasmPath) &&
            fs.existsSync(this.zkeyPath)
        );
    }

    /**
     * Verify an age proof off-chain.
     * Called before the user submits to blockchain (saves gas on invalid proofs).
     *
     * @param {Object} proof       - Groth16 proof { pi_a, pi_b, pi_c, protocol, curve }
     * @param {Array}  publicSignals - [isAdult, currentYear, minAge]  (strings)
     * @returns {boolean} true if proof is valid
     */
    async verifyAgeProofOffchain(proof, publicSignals) {
        const snarkjs = await this.getSnarkjs();
        const vkey = this.getVkey();
        const isValid = await snarkjs.groth16.verify(vkey, publicSignals, proof);
        return isValid;
    }

    /**
     * Get the WASM circuit file buffer (served to Android app for local proof generation)
     */
    getWasmBuffer() {
        if (!fs.existsSync(this.wasmPath)) {
            throw new Error('AgeVerify.wasm not found. Run: node scripts/setupCircuit.js');
        }
        return fs.readFileSync(this.wasmPath);
    }

    /**
     * Get the zkey file buffer (served to Android app for local proof generation)
     */
    getZkeyBuffer() {
        if (!fs.existsSync(this.zkeyPath)) {
            throw new Error('AgeVerify_final.zkey not found. Run: node scripts/setupCircuit.js');
        }
        return fs.readFileSync(this.zkeyPath);
    }

    /**
     * Get file sizes for status endpoint
     */
    getCircuitInfo() {
        const info = { ready: this.isCircuitReady() };
        if (fs.existsSync(this.wasmPath)) {
            info.wasmSizeKb = Math.round(fs.statSync(this.wasmPath).size / 1024);
        }
        if (fs.existsSync(this.zkeyPath)) {
            info.zkeySizeKb = Math.round(fs.statSync(this.zkeyPath).size / 1024);
        }
        return info;
    }
}

module.exports = new ZkpService();
