const express = require('express');
const router = express.Router();
const merkleService = require('../services/merkleService');
const pinataService = require('../services/pinataService');
const { ethers } = require('ethers');

/**
 * Routes for Partial Data Sharing with Merkle Trees
 */

/**
 * @route   POST /api/partial-share/generate-proofs
 * @desc    Generate Merkle proofs for selected attributes
 * @access  Public (should verify owner signature in production)
 */
router.post('/generate-proofs', async (req, res) => {
    try {
        const { recordType, fullRecord, selectedAttributes } = req.body;
        
        if (!recordType || !fullRecord || !selectedAttributes) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: recordType, fullRecord, selectedAttributes'
            });
        }
        
        // Build Merkle tree from full record
        const merkleTree = merkleService.buildMerkleTree(recordType, fullRecord);
        
        // Filter to selected attributes
        const partialData = {};
        selectedAttributes.forEach(attr => {
            if (fullRecord[attr] !== undefined) {
                partialData[attr] = fullRecord[attr];
            }
        });
        
        // Generate proofs for selected attributes
        const proofs = merkleService.generateProofs(merkleTree, partialData);
        
        res.json({
            success: true,
            data: {
                attributes: partialData,
                proofs: proofs,
                merkleRoot: merkleTree.root
            }
        });
        
    } catch (error) {
        console.error('Generate proofs error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   POST /api/partial-share/verify
 * @desc    Verify Merkle proofs against blockchain root
 * @access  Public
 */
router.post('/verify', async (req, res) => {
    try {
        const { attributes, proofs, merkleRoot } = req.body;
        
        if (!attributes || !proofs || !merkleRoot) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }
        
        const verificationResults = {};
        
        for (const [attrName, attrValue] of Object.entries(attributes)) {
            const proof = proofs[attrName];
            
            if (!proof) {
                verificationResults[attrName] = {
                    valid: false,
                    error: 'Missing proof'
                };
                continue;
            }
            
            const isValid = merkleService.verifyProof(
                attrName,
                attrValue,
                proof,
                merkleRoot
            );
            
            verificationResults[attrName] = {
                valid: isValid
            };
        }
        
        const allValid = Object.values(verificationResults).every(r => r.valid);
        
        res.json({
            success: true,
            allValid: allValid,
            results: verificationResults
        });
        
    } catch (error) {
        console.error('Verification error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   POST /api/partial-share/upload-package
 * @desc    Upload partial share package to IPFS
 * @access  Public
 */
router.post('/upload-package', async (req, res) => {
    try {
        const { sharePackage } = req.body;
        
        if (!sharePackage) {
            return res.status(400).json({
                success: false,
                error: 'Missing sharePackage'
            });
        }
        
        // Upload encrypted package to IPFS
        const packageBuffer = Buffer.from(JSON.stringify(sharePackage));
        const result = await pinataService.uploadFile(
            packageBuffer,
            `partial-share-${Date.now()}.json`,
            {
                type: 'partial-share-package',
                version: sharePackage.version || '1.0',
                recordType: sharePackage.recordType,
                timestamp: new Date().toISOString()
            }
        );
        
        res.json({
            success: true,
            ipfsHash: result.ipfsHash,
            fileUrl: pinataService.getFileUrl(result.ipfsHash)
        });
        
    } catch (error) {
        console.error('Upload package error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   GET /api/partial-share/download-package/:ipfsHash
 * @desc    Download partial share package from IPFS
 * @access  Public
 */
router.get('/download-package/:ipfsHash', async (req, res) => {
    try {
        const { ipfsHash } = req.params;
        
        if (!ipfsHash) {
            return res.status(400).json({
                success: false,
                error: 'IPFS hash required'
            });
        }
        
        // Fetch from IPFS
        const fileUrl = pinataService.getFileUrl(ipfsHash);
        const axios = require('axios');
        const response = await axios.get(fileUrl, {
            timeout: 30000
        });
        
        res.json({
            success: true,
            package: response.data
        });
        
    } catch (error) {
        console.error('Download package error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   POST /api/partial-share/build-tree
 * @desc    Build Merkle tree for a record (utility endpoint)
 * @access  Public
 */
router.post('/build-tree', async (req, res) => {
    try {
        const { recordType, attributes } = req.body;
        
        if (!recordType || !attributes) {
            return res.status(400).json({
                success: false,
                error: 'Missing recordType or attributes'
            });
        }
        
        const merkleTree = merkleService.buildMerkleTree(recordType, attributes);
        
        res.json({
            success: true,
            merkleRoot: merkleTree.root,
            treeDepth: merkleTree.tree.length,
            leafCount: merkleTree.leaves.length
        });
        
    } catch (error) {
        console.error('Build tree error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
