const { ethers } = require('ethers');

/**
 * Blockchain Service for ConnectionTest Contract
 * Handles all smart contract interactions using Ethers.js v6
 */
class BlockchainService {
  constructor() {
    // ============================================
    // STEP 1: Connect to Blockchain Network
    // ============================================
    const rpcUrl = process.env.RPC_URL || 'https://polygon-amoy.g.alchemy.com/v2/demo';
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    
    const networkType = rpcUrl.includes('127.0.0.1') ? 'Local Ganache' : 'Polygon Amoy Testnet';
    console.log('Connected to blockchain:', networkType);

    // ============================================
    // STEP 2: Initialize Backend Wallet
    // ============================================
    if (process.env.PRIVATE_KEY) {
      this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
      console.log('Wallet initialized:', this.wallet.address);
    } else {
      console.warn('No PRIVATE_KEY found. Write operations will fail.');
    }

    // ============================================
    // STEP 3: Configure Smart Contract
    // ============================================
    this.contractAddress = process.env.CONTRACT_ADDRESS;
    
    /**
     * Contract ABI - Interface definition for ConnectionTest
     * Matches your Solidity contract exactly
     */
    this.contractABI = [
      // State-changing functions
      "function set(uint256 _newValue) external",
      
      // View functions (read-only, no gas cost)
      "function get() external view returns (uint256)",
      "function ping() external pure returns (string memory)",
      "function owner() external view returns (address)",
      
      // Events
      "event DataUpdated(uint256 newValue, address updater)"
    ];

    // ============================================
    // STEP 4: Initialize Contract Instance
    // ============================================
    if (this.contractAddress && this.wallet) {
      this.contract = new ethers.Contract(
        this.contractAddress,
        this.contractABI,
        this.wallet
      );
      console.log('Smart contract initialized:', this.contractAddress);
    } else {
      console.warn('Contract not initialized. Check CONTRACT_ADDRESS in .env');
    }
  }

  // ============================================
  // CONTRACT INTERACTION METHODS
  // ============================================

  /**
   * Test connection to smart contract
   * @returns {string} "Pong! Connection successful."
   */
  async ping() {
    try {
      this._ensureContract();
      
      console.log('Pinging contract...');
      const response = await this.contract.ping();
      console.log('Ping response:', response);

      return response;

    } catch (error) {
      console.error('Ping failed:', error.message);
      throw new Error(`Failed to ping contract: ${error.message}`);
    }
  }

  /**
   * Set a value in the contract (writes to blockchain)
   * @param {number} value - Value to store
   * @returns {Object} Transaction receipt with gas info
   */
  async setValue(value) {
    try {
      this._ensureContract();
      
      console.log('Setting value on blockchain:', value);

      // Send transaction
      const tx = await this.contract.set(value);
      console.log('Transaction sent:', tx.hash);
      console.log('Waiting for confirmation...');

      // Wait for transaction to be mined
      const receipt = await tx.wait();
      console.log('Transaction confirmed in block:', receipt.blockNumber);

      return {
        hash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status === 1 ? 'success' : 'failed',
        from: receipt.from,
        to: receipt.to
      };

    } catch (error) {
      console.error('[Set value failed:', error.message);
      throw new Error(`Failed to set value: ${error.message}`);
    }
  }

  /**
   * Get the stored value from contract (reads from blockchain)
   * @returns {number} Stored value
   */
  async getValue() {
    try {
      this._ensureContract();

      console.log('Reading value from contract...');
      const value = await this.contract.get();
      
      const numValue = Number(value);
      console.log('Stored value:', numValue);
      
      return numValue;

    } catch (error) {
      console.error('Get value failed:', error.message);
      throw new Error(`Failed to get value: ${error.message}`);
    }
  }

  /**
   * Get contract owner address
   * @returns {string} Owner's wallet address
   */
  async getOwner() {
    try {
      this._ensureContract();

      console.log('Fetching contract owner...');
      const owner = await this.contract.owner();
      console.log('Contract owner:', owner);
      
      return owner;

    } catch (error) {
      console.error('Get owner failed:', error.message);
      throw new Error(`Failed to get owner: ${error.message}`);
    }
  }

  /**
   * Get current block number
   * @returns {number} Latest block number
   */
  async getBlockNumber() {
    try {
      const blockNumber = await this.provider.getBlockNumber();
      console.log('Current block:', blockNumber);
      return blockNumber;
    } catch (error) {
      console.error('Get block number failed:', error.message);
      throw new Error(`Failed to get block number: ${error.message}`);
    }
  }

  /**
   * Get network information
   * @returns {Object} Network details
   */
  async getNetwork() {
    try {
      const network = await this.provider.getNetwork();
      return {
        name: network.name,
        chainId: Number(network.chainId),
        ensAddress: network.ensAddress || 'Not supported'
      };
    } catch (error) {
      console.error('Get network failed:', error.message);
      throw new Error(`Failed to get network: ${error.message}`);
    }
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Store health record on blockchain
   * @deprecated Use setValue() directly instead
   * @param {string} recordId - Record identifier
   * @param {string} ipfsHash - IPFS hash
   * @param {string} patientAddress - Patient address
   * @returns {Object} Transaction receipt
   */
  async storeHealthRecord(recordId, ipfsHash, patientAddress) {
    console.warn('Using legacy storeHealthRecord method');
    
    // Convert record data to numeric hash
    const dataHash = Math.abs(recordId.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0));

    console.log('Storing record hash:', {
      recordId,
      ipfsHash,
      patientAddress,
      dataHash
    });

    return await this.setValue(dataHash);
  }

  /**
   * Get health record from blockchain
   * @deprecated Use getValue() directly instead
   * @param {string} recordId - Record identifier
   * @returns {Object} Record data
   */
  async getHealthRecord(recordId) {
    console.warn('Using legacy getHealthRecord method');
    
    const value = await this.getValue();

    return {
      recordId,
      storedValue: value,
      note: 'Using ConnectionTest contract - stores numeric values only'
    };
  }

  /**
   * Get all health records for a patient
   * @deprecated Use getValue() directly instead
   * @param {string} patientAddress - Patient address
   * @returns {Array} Array of records
   */
  async getHealthRecords(patientAddress) {
    console.warn('Using legacy getHealthRecords method');
    
    const value = await this.getValue();

    return [{
      recordId: 'TEST_RECORD',
      patientAddress,
      storedValue: value,
      note: 'Using ConnectionTest contract - limited functionality'
    }];
  }

  /**
   * Check wallet balance
   * @param {string} address - Wallet address to check (optional, defaults to backend wallet)
   * @returns {Object} Balance information
   */
  async getBalance(address = null) {
    try {
      const targetAddress = address || this.wallet?.address;
      
      if (!targetAddress) {
        throw new Error('No wallet address available');
      }

      const balance = await this.provider.getBalance(targetAddress);

      return {
        address: targetAddress,
        balance: ethers.formatEther(balance),
        balanceWei: balance.toString(),
        balanceETH: parseFloat(ethers.formatEther(balance)).toFixed(6)
      };

    } catch (error) {
      console.error('Get balance failed:', error.message);
      throw new Error(`Failed to get balance: ${error.message}`);
    }
  }

  /**
   * Get current gas price information
   * @returns {Object} Gas price in different units
   */
  async getGasPrice() {
    try {
      const feeData = await this.provider.getFeeData();

      return {
        gasPrice: feeData.gasPrice ? ethers.formatUnits(feeData.gasPrice, 'gwei') + ' gwei' : 'N/A',
        maxFeePerGas: feeData.maxFeePerGas ? ethers.formatUnits(feeData.maxFeePerGas, 'gwei') + ' gwei' : 'N/A',
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ? ethers.formatUnits(feeData.maxPriorityFeePerGas, 'gwei') + ' gwei' : 'N/A'
      };

    } catch (error) {
      console.error('Get gas price failed:', error.message);
      throw new Error(`Failed to get gas price: ${error.message}`);
    }
  }

  // ============================================
  // INTERNAL HELPER METHODS
  // ============================================

  /**
   * Ensure contract is initialized before use
   * @private
   */
  _ensureContract() {
    if (!this.contract) {
      throw new Error('Contract not initialized. Check CONTRACT_ADDRESS and PRIVATE_KEY in .env');
    }
  }
}

// ============================================
// EXPORT SINGLETON INSTANCE
// ============================================
module.exports = new BlockchainService();
