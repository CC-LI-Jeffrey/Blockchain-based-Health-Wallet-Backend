const express = require('express');
const router = express.Router();
const multer = require('multer');
const pinataService = require('../services/pinataService');

// Configure multer for file upload (store in memory)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept common file types (you can customize this)
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain',
      'application/json',
      'application/octet-stream'
    ];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not supported`), false);
    }
  }
});

/**
 * @route   POST /api/ipfs/upload
 * @desc    Upload an encrypted file to IPFS via Pinata
 * @access  Public
 * @note    Files should be encrypted client-side before upload.
 *          Backend cannot decrypt these files - only stores them on IPFS.
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file provided'
      });
    }
    
    console.log(`Uploading encrypted file: ${req.file.originalname} (${req.file.size} bytes)`);

    // Extract metadata from request body
    const metadata = {
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      encrypted: true, // Mark as encrypted
      uploadedAt: new Date().toISOString(),
      ...(req.body.metadata && JSON.parse(req.body.metadata))
    };

    // Upload encrypted file to IPFS
    // Note: Backend cannot decrypt this file - it only stores it
    const result = await pinataService.uploadFile(
      req.file.buffer,
      req.file.originalname,
      metadata
    );

    // Get the gateway URL
    const fileUrl = pinataService.getFileUrl(result.ipfsHash);
    
    console.log(`File uploaded successfully. IPFS Hash: ${result.ipfsHash}`);

    res.json({
      success: true,
      message: 'Encrypted file uploaded successfully to IPFS',
      ipfsHash: result.ipfsHash,
      fileUrl: fileUrl,
      pinSize: result.pinSize,
      timestamp: result.timestamp
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Upload failed',
      message: error.message
    });
  }
});

/**
 * @route   DELETE /api/ipfs/delete/:ipfsHash
 * @desc    Delete a file from IPFS via Pinata
 * @access  Public (you can add authentication middleware later)
 */
router.delete('/delete/:ipfsHash', async (req, res) => {
  try {
    const { ipfsHash } = req.params;

    if (!ipfsHash) {
      return res.status(400).json({
        success: false,
        error: 'IPFS hash is required'
      });
    }

    // Delete from IPFS
    await pinataService.deleteFile(ipfsHash);

    res.json({
      success: true,
      message: 'File deleted successfully',
      data: {
        ipfsHash: ipfsHash,
        deletedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({
      success: false,
      error: 'Delete failed',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/ipfs/url/:ipfsHash
 * @desc    Get the gateway URL for an IPFS hash
 * @access  Public
 */
router.get('/url/:ipfsHash', (req, res) => {
  try {
    const { ipfsHash } = req.params;

    if (!ipfsHash) {
      return res.status(400).json({
        success: false,
        error: 'IPFS hash is required'
      });
    }

    const fileUrl = pinataService.getFileUrl(ipfsHash);

    res.json({
      success: true,
      data: {
        ipfsHash: ipfsHash,
        fileUrl: fileUrl
      }
    });

  } catch (error) {
    console.error('URL error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate URL',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/ipfs/file/:ipfsHash
 * @desc    Retrieve file content from IPFS
 * @access  Public
 */
router.get('/file/:ipfsHash', async (req, res) => {
  try {
    const { ipfsHash } = req.params;

    if (!ipfsHash) {
      return res.status(400).json({
        success: false,
        error: 'IPFS hash is required'
      });
    }

    console.log(`Fetching file from IPFS: ${ipfsHash}`);

    // Fetch file from Pinata gateway
    const fileUrl = pinataService.getFileUrl(ipfsHash);
    const axios = require('axios');
    const response = await axios.get(fileUrl, {
      responseType: 'arraybuffer',
      timeout: 30000
    });

    // Forward the file content with original content type
    res.set('Content-Type', response.headers['content-type'] || 'application/octet-stream');
    res.send(response.data);

  } catch (error) {
    console.error('File retrieval error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve file from IPFS',
      message: error.message
    });
  }
});

module.exports = router;
