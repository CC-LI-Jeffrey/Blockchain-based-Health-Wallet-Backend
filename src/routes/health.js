const express = require('express');
const router = express.Router();
const multer = require('multer');
const { ethers } = require('ethers');
const pinataService = require('../services/pinataService');
const blockchainService = require('../services/blockchainService');

// Configure multer for file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and PDF allowed.'));
    }
  }
});

/**
 * @route   POST /api/health/upload
 * @desc    Upload health record to IPFS and store hash on blockchain
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { walletAddress, message, signature, recordType } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    if (!walletAddress || !message || !signature) {
      return res.status(400).json({ 
        error: 'Missing required fields: walletAddress, message, signature' 
      });
    }

    // Verify signature
    const recoveredAddress = ethers.verifyMessage(message, signature);
    
    if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      return res.status(401).json({ 
        error: 'Invalid signature' 
      });
    }

    console.log(`✓ Signature verified for wallet: ${walletAddress}`);

    // Upload to IPFS
    console.log('Uploading to IPFS...');
    const ipfsResult = await pinataService.uploadFile(file.buffer, {
      name: file.originalname,
      keyvalues: {
        walletAddress: walletAddress,
        recordType: recordType || 'medical-record',
        uploadTimestamp: Date.now().toString()
      }
    });

    console.log(`✓ File uploaded to IPFS: ${ipfsResult.IpfsHash}`);

    // Store on blockchain
    console.log('Storing hash on blockchain...');
    const recordId = `RECORD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const txReceipt = await blockchainService.storeHealthRecord(
      recordId,
      ipfsResult.IpfsHash,
      walletAddress
    );

    console.log(`✓ Transaction confirmed: ${txReceipt.hash}`);

    res.status(200).json({
      success: true,
      message: 'Health record uploaded successfully',
      recordId: recordId,
      ipfsHash: ipfsResult.IpfsHash,
      ipfsUrl: `https://gateway.pinata.cloud/ipfs/${ipfsResult.IpfsHash}`,
      txHash: txReceipt.hash,
      blockNumber: txReceipt.blockNumber,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to upload health record'
    });
  }
});

/**
 * @route   GET /api/health/records/:walletAddress
 * @desc    Get all health records for a wallet address
 */
router.get('/records/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;

    if (!ethers.isAddress(walletAddress)) {
      return res.status(400).json({ error: 'Invalid wallet address format' });
    }

    console.log(`Fetching records for wallet: ${walletAddress}`);

    const records = await blockchainService.getHealthRecords(walletAddress);

    res.status(200).json({
      success: true,
      walletAddress: walletAddress,
      count: records.length,
      records: records
    });

  } catch (error) {
    console.error('Fetch records error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to fetch health records'
    });
  }
});

/**
 * @route   GET /api/health/record/:recordId
 * @desc    Get a specific health record by ID
 */
router.get('/record/:recordId', async (req, res) => {
  try {
    const { recordId } = req.params;

    console.log(`Fetching record: ${recordId}`);

    const record = await blockchainService.getHealthRecord(recordId);

    res.status(200).json({
      success: true,
      recordId: recordId,
      record: record
    });

  } catch (error) {
    console.error('Fetch record error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to fetch health record'
    });
  }
});

/**
 * @route   POST /api/health/verify-signature
 * @desc    Verify a wallet signature
 */
router.post('/verify-signature', async (req, res) => {
  try {
    const { walletAddress, message, signature } = req.body;

    if (!walletAddress || !message || !signature) {
      return res.status(400).json({ 
        error: 'Missing required fields: walletAddress, message, signature' 
      });
    }

    const recoveredAddress = ethers.verifyMessage(message, signature);
    const isValid = recoveredAddress.toLowerCase() === walletAddress.toLowerCase();

    res.status(200).json({
      success: true,
      isValid: isValid,
      providedAddress: walletAddress,
      recoveredAddress: recoveredAddress,
      message: message
    });

  } catch (error) {
    console.error('Verify signature error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to verify signature'
    });
  }
});

module.exports = router;
