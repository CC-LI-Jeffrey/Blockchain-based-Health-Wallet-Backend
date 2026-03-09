const express = require('express');
const router = express.Router();
const zkpService = require('../services/zkpService');

/**
 * @route   GET /api/zkp/status
 * @desc    Check if circuit files are ready to serve
 */
router.get('/status', (req, res) => {
    try {
        const info = zkpService.getCircuitInfo();
        res.json({
            success: true,
            ready: info.ready,
            wasmSizeKb: info.wasmSizeKb || null,
            zkeySizeKb: info.zkeySizeKb || null,
            message: info.ready
                ? 'Circuit files ready'
                : 'Circuit not set up. Run: node scripts/setupCircuit.js'
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * @route   GET /api/zkp/circuits/wasm
 * @desc    Serve AgeVerify.wasm to Android app (downloaded once, cached in app storage)
 */
router.get('/circuits/wasm', (req, res) => {
    try {
        const buffer = zkpService.getWasmBuffer();
        res.setHeader('Content-Type', 'application/wasm');
        res.setHeader('Content-Length', buffer.length);
        res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache 1 day
        res.send(buffer);
    } catch (err) {
        res.status(404).json({
            success: false,
            error: err.message,
            hint: 'Run: node scripts/setupCircuit.js to generate circuit files'
        });
    }
});

/**
 * @route   GET /api/zkp/circuits/zkey
 * @desc    Serve AgeVerify_final.zkey to Android app (downloaded once, cached)
 */
router.get('/circuits/zkey', (req, res) => {
    try {
        const buffer = zkpService.getZkeyBuffer();
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Length', buffer.length);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.send(buffer);
    } catch (err) {
        res.status(404).json({
            success: false,
            error: err.message,
            hint: 'Run: node scripts/setupCircuit.js to generate circuit files'
        });
    }
});

/**
 * @route   POST /api/zkp/verify-offchain
 * @desc    Verify an age proof off-chain before the user pays gas to submit on-chain.
 *          This is optional but saves gas on invalid proofs.
 *
 * @body    { proof: Object, publicSignals: string[] }
 *          proof        - Groth16 proof object from snarkjs
 *          publicSignals - ["1", "2026", "18"]  (isAdult, currentYear, minAge)
 */
router.post('/verify-offchain', async (req, res) => {
    try {
        const { proof, publicSignals } = req.body;

        if (!proof || !publicSignals) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: proof, publicSignals'
            });
        }

        if (!Array.isArray(publicSignals) || publicSignals.length !== 3) {
            return res.status(400).json({
                success: false,
                error: 'publicSignals must be an array of 3 strings: [isAdult, currentYear, minAge]'
            });
        }

        const isValid = await zkpService.verifyAgeProofOffchain(proof, publicSignals);

        res.json({
            success: true,
            isValid,
            publicSignals: {
                isAdult: publicSignals[0] === '1',
                currentYear: parseInt(publicSignals[1]),
                minAge: parseInt(publicSignals[2])
            }
        });

    } catch (err) {
        if (err.message.includes('not found')) {
            return res.status(503).json({
                success: false,
                error: 'Circuit not ready. Run: node scripts/setupCircuit.js',
                isValid: false
            });
        }
        res.status(500).json({
            success: false,
            error: err.message,
            isValid: false
        });
    }
});

module.exports = router;
