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
    const [owner, value, balance, gasPrice, blockNumber, network] = await Promise.all([
      blockchainService.getOwner(),
      blockchainService.getBalance(),
      blockchainService.getGasPrice(),
      blockchainService.getBlockNumber(),
      blockchainService.getNetwork()
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
        ...network,
        currentBlock: blockNumber,
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

/**
 * @route   GET /api/test/network
 * @desc    Get network information
 */
router.get('/network', async (req, res) => {
  try {
    const [network, blockNumber, gasPrice] = await Promise.all([
      blockchainService.getNetwork(),
      blockchainService.getBlockNumber(),
      blockchainService.getGasPrice()
    ]);

    res.status(200).json({
      success: true,
      network: {
        ...network,
        currentBlock: blockNumber,
        gasPrice: gasPrice,
        rpcUrl: process.env.RPC_URL
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get network error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   GET /api/test/balance
 * @desc    Get balance for backend wallet
 */
router.get('/balance', async (req, res) => {
  try {
    const balance = await blockchainService.getBalance();

    res.status(200).json({
      success: true,
      balance: balance,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   GET /api/test/balance/:address
 * @desc    Get balance for specific wallet address
 */
router.get('/balance/:address', async (req, res) => {
  try {
    const address = req.params.address;
    const balance = await blockchainService.getBalance(address);

    res.status(200).json({
      success: true,
      balance: balance,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   GET /api/test/health
 * @desc    Complete health check of blockchain connection
 */
router.get('/health', async (req, res) => {
  const checks = {
    provider: false,
    wallet: false,
    contract: false,
    network: false
  };

  try {
    // Check provider
    try {
      await blockchainService.getBlockNumber();
      checks.provider = true;
    } catch (e) {
      checks.providerError = e.message;
    }

    // Check wallet
    try {
      await blockchainService.getBalance();
      checks.wallet = true;
    } catch (e) {
      checks.walletError = e.message;
    }

    // Check contract
    try {
      await blockchainService.ping();
      checks.contract = true;
    } catch (e) {
      checks.contractError = e.message;
    }

    // Check network
    try {
      await blockchainService.getNetwork();
      checks.network = true;
    } catch (e) {
      checks.networkError = e.message;
    }

    const allHealthy = Object.values(checks).every(v => v === true);

    res.status(allHealthy ? 200 : 503).json({
      success: allHealthy,
      message: allHealthy ? 'All systems operational' : 'Some checks failed',
      checks: checks,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      checks: checks
    });
  }
});

module.exports = router;
