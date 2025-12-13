const { ethers } = require('ethers');

/**
 * Blockchain Service for ConnectionTest Contract
 * Uses Ethers.js to interact with your smart contract
 */
class BlockchainService {
  constructor() {
    // Initialize provider (connection to blockchain)
    const rpcUrl = process.env.RPC_URL || 'https://polygon-amoy.g.alchemy.com/v2/demo';
    
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    console.log('✓ Connected to blockchain:', rpcUrl.includes('127.0.0.1') ? 'Local Network' : 'Polygon Amoy Testnet');

    // Initialize wallet (for signing transactions)
    if (process.env.PRIVATE_KEY) {
      this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
      console.log('✓ Blockchain wallet initialized:', this.wallet.address);
    } else {
      console.warn('⚠ WARNING: No PRIVATE_KEY in environment. Blockchain writes will fail.');
    }

    // Smart contract configuration
    this.contractAddress = process.env.CONTRACT_ADDRESS;
    
    // ABI for ConnectionTest contract
    this.contractABI = [
      "function set(uint256 _newValue) external",
      "function get() external view returns (uint256)",
      "function ping() external pure returns (string memory)",
      "function owner() external view returns (address)",
      "event DataUpdated(uint256 newValue, address updater)"
    ];

    // Initialize contract instance
    if (this.contractAddress && this.wallet) {
      this.contract = new ethers.Contract(
        this.contractAddress,
        this.contractABI,
        this.wallet
      );
      console.log('Smart contract initialized:', this.contractAddress);
    } else {
      console.warn('WARNING: Contract not initialized. Set CONTRACT_ADDRESS and PRIVATE_KEY.');
    }
  }

  /**
   * Test connection to smart contract
   * @returns {string} Ping response
   */
  async ping() {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized. Check CONTRACT_ADDRESS in .env');
      }

      console.log('Pinging contract...');
      const response = await this.contract.ping();
      console.log('Ping response:', response);

      return response;

    } catch (error) {
      console.error('Ping error:', error);
      throw new Error(`Failed to ping contract: ${error.message}`);
    }
  }

  /**
   * Set a value in the contract
   * @param {number} value - Value to store
   * @returns {Object} Transaction receipt
   */
  async setValue(value) {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized. Check CONTRACT_ADDRESS and PRIVATE_KEY in .env');
      }

      console.log('Setting value on blockchain:', value);

      // Call smart contract function
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
        status: receipt.status === 1 ? 'success' : 'failed'
      };

    } catch (error) {
      console.error('Set value error:', error);
      throw new Error(`Failed to set value on blockchain: ${error.message}`);
    }
  }

  /**
   * Get the stored value from contract
   * @returns {number} Stored value
   */
  async getValue() {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }

      console.log('Getting value from contract...');
      const value = await this.contract.get();
      
      console.log('Stored value:', value.toString());
      return Number(value);

    } catch (error) {
      console.error('Get value error:', error);
      throw new Error(`Failed to get value from blockchain: ${error.message}`);
    }
  }

  /**
   * Get contract owner address
   * @returns {string} Owner address
   */
  async getOwner() {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }

      const owner = await this.contract.owner();
      console.log('Contract owner:', owner);
      
      return owner;

    } catch (error) {
      console.error('Get owner error:', error);
      throw new Error(`Failed to get owner: ${error.message}`);
    }
  }

  /**
   * Store health record on blockchain (uses set function for now)
   * @param {string} recordId - Unique record identifier
   * @param {string} ipfsHash - IPFS hash of the file
   * @param {string} patientAddress - Patient's wallet address
   * @returns {Object} Transaction receipt
   */
  async storeHealthRecord(recordId, ipfsHash, patientAddress) {
    try {
      // Convert record data to a numeric hash for the test contract
      const dataHash = Math.abs(recordId.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0));

      console.log('Storing record hash on blockchain:', {
        recordId,
        ipfsHash,
        patientAddress,
        dataHash
      });

      return await this.setValue(dataHash);

    } catch (error) {
      console.error('Blockchain store error:', error);
      throw new Error(`Failed to store on blockchain: ${error.message}`);
    }
  }

  /**
   * Get health record from blockchain
   * @param {string} recordId - Record identifier
   * @returns {Object} Record data
   */
  async getHealthRecord(recordId) {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }

      console.log('Fetching record from blockchain:', recordId);
      const value = await this.getValue();

      return {
        recordId,
        storedValue: value,
        note: 'Using ConnectionTest contract - stores numeric hash only'
      };

    } catch (error) {
      console.error('Blockchain get error:', error);
      throw new Error(`Failed to get record from blockchain: ${error.message}`);
    }
  }

  /**
   * Get all health records for a patient
   * @param {string} patientAddress - Patient's wallet address
   * @returns {Array} Array of records
   */
  async getHealthRecords(patientAddress) {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }

      console.log('Fetching records for patient:', patientAddress);
      const value = await this.getValue();

      return [{
        recordId: 'TEST_RECORD',
        patientAddress,
        storedValue: value,
        note: 'Using ConnectionTest contract - limited functionality'
      }];

    } catch (error) {
      console.error('Blockchain get records error:', error);
      throw new Error(`Failed to get records from blockchain: ${error.message}`);
    }
  }

  /**
   * Check wallet balance
   * @param {string} address - Wallet address to check
   * @returns {Object} Balance information
   */
  async getBalance(address = null) {
    try {
      const targetAddress = address || this.wallet.address;
      const balance = await this.provider.getBalance(targetAddress);

      return {
        address: targetAddress,
        balance: ethers.formatEther(balance),
        balanceWei: balance.toString()
      };

    } catch (error) {
      console.error('Get balance error:', error);
      throw new Error(`Failed to get balance: ${error.message}`);
    }
  }

  /**
   * Get current gas price
   * @returns {Object} Gas price information
   */
  async getGasPrice() {
    try {
      const feeData = await this.provider.getFeeData();

      return {
        gasPrice: ethers.formatUnits(feeData.gasPrice, 'gwei'),
        maxFeePerGas: feeData.maxFeePerGas ? ethers.formatUnits(feeData.maxFeePerGas, 'gwei') : null,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ? ethers.formatUnits(feeData.maxPriorityFeePerGas, 'gwei') : null
      };

    } catch (error) {
      console.error('Get gas price error:', error);
      throw new Error(`Failed to get gas price: ${error.message}`);
    }
  }
}

// Export singleton instance
module.exports = new BlockchainService();
