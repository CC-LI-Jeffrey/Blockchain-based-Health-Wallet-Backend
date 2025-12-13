const express = require('express');
const router = express.Router();
const blockchainService = require('../services/blockchainService');

/**
 * @route   GET /api/test/ping
 * @desc    Test connection to smart contract
 */
router.get('/ping', async (req, res) => {
  try {
    const response = await blockchainService.ping();
    
    res.status(200).json({
      success: true,
      message: 'Contract connection successful',
      contractResponse: response,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Ping test error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   POST /api/test/set/:value
 * @desc    Set a value in the smart contract
 */
router.post('/set/:value', async (req, res) => {
  try {
    const value = parseInt(req.params.value);

    if (isNaN(value)) {
      return res.status(400).json({ error: 'Invalid value. Must be a number.' });
    }

    const receipt = await blockchainService.setValue(value);

    res.status(200).json({
      success: true,
      message: 'Value set successfully',
      value: value,
      transaction: receipt,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Set value test error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   GET /api/test/get
 * @desc    Get the stored value from smart contract
 */
router.get('/get', async (req, res) => {
  try {
    const value = await blockchainService.getValue();

    res.status(200).json({
      success: true,
      storedValue: value,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get value test error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   GET /api/test/owner
 * @desc    Get the contract owner address
 */
router.get('/owner', async (req, res) => {
  try {
    const owner = await blockchainService.getOwner();

    res.status(200).json({
      success: true,
      owner: owner,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get owner test error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   GET /api/test/info
 * @desc    Get all contract and wallet information
 */
router.get('/info', async (req, res) => {
  try {
    const [owner, value, balance, gasPrice] = await Promise.all([
      blockchainService.getOwner(),
      blockchainService.getValue(),
      blockchainService.getBalance(),
      blockchainService.getGasPrice()
    ]);

    res.status(200).json({
      success: true,
      contract: {
        address: process.env.CONTRACT_ADDRESS,
        owner: owner,
        storedValue: value
      },
      wallet: balance,
      network: {
        gasPrice: gasPrice
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get info test error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
