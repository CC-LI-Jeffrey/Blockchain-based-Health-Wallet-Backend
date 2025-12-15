const express = require('express');
const router = express.Router();
const blockchainService = require('../services/blockchainService');

/**
 * @route   GET /api/test/ping
 * @desc    Test connection to HealthWalletV2 contract (Sepolia)
 */
router.get('/ping', async (req, res) => {
  try {
    // Test contract connection by getting network info
    const network = await blockchainService.getNetwork();
    const blockNumber = await blockchainService.getBlockNumber();
    const counts = await blockchainService.getTotalCounts();
    
    res.status(200).json({
      success: true,
      message: 'HealthWalletV2 connection successful',
      network: network,
      blockNumber: blockNumber,
      contractStats: counts,
      contractAddress: blockchainService.contractAddress,
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
 * @route   GET /api/test/network
 * @desc    Get blockchain network information
 */
router.get('/network', async (req, res) => {
  try {
    const network = await blockchainService.getNetwork();
    const blockNumber = await blockchainService.getBlockNumber();
    const gasPrice = await blockchainService.getGasPrice();

    res.status(200).json({
      success: true,
      network: network,
      latestBlock: blockNumber,
      gasPrice: gasPrice,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Network test error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   GET /api/test/stats
 * @desc    Get contract statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const counts = await blockchainService.getTotalCounts();

    res.status(200).json({
      success: true,
      stats: counts,
      contractAddress: blockchainService.contractAddress,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Stats test error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   GET /api/test/balance/:address
 * @desc    Get ETH balance for an address
 */
router.get('/balance/:address', async (req, res) => {
  try {
    const address = req.params.address;
    const balance = await blockchainService.getBalance(address);

    res.status(200).json({
      success: true,
      address: address,
      balance: balance + ' ETH',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Balance test error:', error);
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
