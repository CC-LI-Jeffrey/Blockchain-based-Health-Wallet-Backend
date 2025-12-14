const { ethers } = require('ethers');

/**
 * Blockchain Service for HealthWallet Smart Contract
 * Handles all smart contract interactions using Ethers.js v6
 * Supports health records, access control, provider authorization, and audit logging
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
     * HealthWallet Contract ABI
     * Matches the deployed contract structure
     */
    this.contractABI = [
      // Health Record Management
      "function addRecord(string memory _ipfsHash, uint8 _recordType, string memory _encryptedKey) public returns (uint256)",
      "function addRecordByProvider(address _patientAddress, string memory _ipfsHash, uint8 _recordType, string memory _encryptedKey) public returns (uint256)",
      "function getRecord(uint256 _recordId) public view returns (tuple(uint256 recordId, address patientAddress, string ipfsHash, uint8 recordType, uint256 timestamp, address issuedBy, bool isActive, string encryptedKey, uint256 version))",
      "function updateRecord(uint256 _recordId, string memory _newIpfsHash, string memory _newEncryptedKey) public",
      "function deleteRecord(uint256 _recordId) public",
      "function getPatientRecords(address _patient) public view returns (uint256[] memory)",
      "function getTotalRecords() public view returns (uint256)",
      
      // Access Control (different signature - takes array and duration)
      "function grantAccess(address _grantee, uint256[] memory _recordIds, uint256 _durationInDays) public",
      "function revokeAccess(address _grantee) public",
      "function hasAccess(address _patient, address _requester, uint256 _recordId) public view returns (bool)",
      "function getAccessGrant(address _patient, address _grantee) public view returns (tuple(address grantedTo, uint256[] recordIds, uint256 expiryTime, bool isActive, uint256 grantedAt))",
      
      // Provider Authorization (Admin only)
      "function authorizeProvider(address _provider) public",
      "function revokeProviderAuthorization(address _provider) public",
      "function isAuthorizedProvider(address _provider) public view returns (bool)",
      
      // Emergency Contact (public mapping)
      "function setEmergencyContact(address _emergencyContact) public",
      "function emergencyContact(address) public view returns (address)",
      
      // Audit Logging
      "function logAccess(uint256 _recordId, uint8 _action) public",
      "function getAuditLogs(uint256 _recordId) public view returns (tuple(address accessor, uint256 timestamp, uint8 action)[] memory)",
      
      // OpenZeppelin AccessControl
      "function hasRole(bytes32 role, address account) external view returns (bool)",
      "function getRoleAdmin(bytes32 role) external view returns (bytes32)",
      "function grantRole(bytes32 role, address account) external",
      "function revokeRole(bytes32 role, address account) external",
      "function renounceRole(bytes32 role, address account) external",
      
      // OpenZeppelin Ownable
      "function owner() external view returns (address)",
      "function transferOwnership(address newOwner) external",
      "function renounceOwnership() external",
      
      // Role Constants
      "function DEFAULT_ADMIN_ROLE() external pure returns (bytes32)",
      "function PROVIDER_ROLE() external pure returns (bytes32)",
      
      // Events
      "event RecordAdded(uint256 indexed recordId, address indexed patient, string ipfsHash, uint8 recordType)",
      "event RecordUpdated(uint256 indexed recordId, string newIpfsHash, uint256 version)",
      "event AccessGranted(address indexed patient, address indexed grantedTo, uint256 expiryTime)",
      "event AccessRevoked(address indexed patient, address indexed revokedFrom)",
      "event RecordAccessed(uint256 indexed recordId, address indexed accessor, uint256 timestamp)",
      "event EmergencyAccessUsed(address indexed patient, address indexed emergencyContact, uint256 timestamp)"
    ];

    // ============================================
    // STEP 4: Define Enums (matching Solidity)
    // ============================================
    this.RecordType = {
      LAB_REPORT: 0,
      PRESCRIPTION: 1,
      MEDICAL_IMAGE: 2,
      DIAGNOSIS: 3,
      VACCINATION: 4,
      VISIT_SUMMARY: 5
    };

    this.AuditAction = {
      VIEW: 0,
      DOWNLOAD: 1,
      SHARE: 2,
      UPDATE: 3,
      DELETE: 4
    };

    // ============================================
    // STEP 5: Initialize Contract Instance
    // ============================================
    if (this.contractAddress && this.wallet) {
      this.contract = new ethers.Contract(
        this.contractAddress,
        this.contractABI,
        this.wallet
      );
      console.log('HealthWallet contract initialized:', this.contractAddress);
    } else {
      console.warn('Contract not initialized. Check CONTRACT_ADDRESS and PRIVATE_KEY in .env');
    }
  }

  // ============================================
  // HEALTH RECORD METHODS
  // ============================================

  /**
   * Add a health record (patient adds their own record)
   * @param {string} ipfsHash - IPFS hash of encrypted record
   * @param {number} recordType - Record type (0-5)
   * @param {string} encryptedKey - Encrypted symmetric key
   * @returns {Object} Transaction result with record ID
   */
  async addRecord(ipfsHash, recordType, encryptedKey) {
    try {
      this._ensureContract();
      
      console.log('Adding health record:', {
        ipfsHash,
        recordType: this._getRecordTypeName(recordType),
        encryptedKey: encryptedKey.substring(0, 20) + '...'
      });

      const tx = await this.contract.addRecord(ipfsHash, recordType, encryptedKey);
      console.log('Transaction sent:', tx.hash);
      
      const receipt = await tx.wait();
      console.log('Transaction confirmed in block:', receipt.blockNumber);

      // Extract RecordAdded event to get the record ID
      const event = receipt.logs.find(log => {
        try {
          const parsed = this.contract.interface.parseLog(log);
          return parsed.name === 'RecordAdded';
        } catch {
          return false;
        }
      });

      let recordId = null;
      if (event) {
        const parsed = this.contract.interface.parseLog(event);
        recordId = Number(parsed.args.recordId);
        console.log('Record added with ID:', recordId);
      }

      return {
        success: true,
        recordId,
        hash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };

    } catch (error) {
      console.error('Add record failed:', error.message);
      throw new Error(`Failed to add record: ${error.message}`);
    }
  }

  /**
   * Add a health record on behalf of a patient (provider only)
   * @param {string} patientAddress - Patient's wallet address
   * @param {string} ipfsHash - IPFS hash of encrypted record
   * @param {number} recordType - Record type (0-5)
   * @param {string} encryptedKey - Encrypted symmetric key
   * @returns {Object} Transaction result with record ID
   */
  async addRecordByProvider(patientAddress, ipfsHash, recordType, encryptedKey) {
    try {
      this._ensureContract();
      
      console.log('Provider adding record for patient:', {
        patient: patientAddress,
        ipfsHash,
        recordType: this._getRecordTypeName(recordType)
      });

      const tx = await this.contract.addRecordByProvider(
        patientAddress,
        ipfsHash,
        recordType,
        encryptedKey
      );
      console.log('Transaction sent:', tx.hash);
      
      const receipt = await tx.wait();
      console.log('Transaction confirmed in block:', receipt.blockNumber);

      const event = receipt.logs.find(log => {
        try {
          const parsed = this.contract.interface.parseLog(log);
          return parsed.name === 'RecordAdded';
        } catch {
          return false;
        }
      });

      let recordId = null;
      if (event) {
        const parsed = this.contract.interface.parseLog(event);
        recordId = Number(parsed.args.recordId);
        console.log('Record added with ID:', recordId);
      }

      return {
        success: true,
        recordId,
        hash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };

    } catch (error) {
      console.error('Add record by provider failed:', error.message);
      throw new Error(`Failed to add record by provider: ${error.message}`);
    }
  }

  /**
   * Get a specific health record
   * @param {number} recordId - Record ID
   * @returns {Object} Record details
   */
  async getRecord(recordId) {
    try {
      this._ensureContract();
      
      console.log('Fetching record:', recordId);
      const record = await this.contract.getRecord(recordId);

      const formattedRecord = {
        recordId: Number(record.recordId),
        patientAddress: record.patientAddress,
        ipfsHash: record.ipfsHash,
        recordType: Number(record.recordType),
        recordTypeName: this._getRecordTypeName(Number(record.recordType)),
        encryptedKey: record.encryptedKey,
        timestamp: Number(record.timestamp),
        timestampDate: new Date(Number(record.timestamp) * 1000).toISOString(),
        issuedBy: record.issuedBy,
        isActive: record.isActive,
        version: Number(record.version)
      };

      console.log('Record retrieved:', formattedRecord.recordId);
      return formattedRecord;

    } catch (error) {
      console.error('Get record failed:', error.message);
      throw new Error(`Failed to get record: ${error.message}`);
    }
  }

  /**
   * Update an existing health record
   * @param {number} recordId - Record ID
   * @param {string} newIpfsHash - New IPFS hash
   * @param {string} newEncryptedKey - New encrypted key
   * @returns {Object} Transaction result
   */
  async updateRecord(recordId, newIpfsHash, newEncryptedKey) {
    try {
      this._ensureContract();
      
      console.log('Updating record:', recordId);

      const tx = await this.contract.updateRecord(recordId, newIpfsHash, newEncryptedKey);
      console.log('Transaction sent:', tx.hash);
      
      const receipt = await tx.wait();
      console.log('Transaction confirmed in block:', receipt.blockNumber);

      return {
        success: true,
        hash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };

    } catch (error) {
      console.error('Update record failed:', error.message);
      throw new Error(`Failed to update record: ${error.message}`);
    }
  }

  /**
   * Delete a health record (soft delete)
   * @param {number} recordId - Record ID
   * @returns {Object} Transaction result
   */
  async deleteRecord(recordId) {
    try {
      this._ensureContract();
      
      console.log('Deleting record:', recordId);

      const tx = await this.contract.deleteRecord(recordId);
      console.log('Transaction sent:', tx.hash);
      
      const receipt = await tx.wait();
      console.log('Transaction confirmed in block:', receipt.blockNumber);

      return {
        success: true,
        hash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };

    } catch (error) {
      console.error('Delete record failed:', error.message);
      throw new Error(`Failed to delete record: ${error.message}`);
    }
  }

  /**
   * Get all record IDs for a patient
   * @param {string} patientAddress - Patient's wallet address
   * @returns {Array} Array of record IDs
   */
  async getPatientRecords(patientAddress) {
    try {
      this._ensureContract();
      
      // Validate address format
      if (!ethers.isAddress(patientAddress)) {
        throw new Error(`Invalid address format: ${patientAddress}. Must be a valid Ethereum address (0x...)`);
      }
      
      console.log('Fetching records for patient:', patientAddress);
      const recordIds = await this.contract.getPatientRecords(patientAddress);

      const formattedIds = recordIds.map(id => Number(id));
      console.log('Found records:', formattedIds.length);
      
      return formattedIds;

    } catch (error) {
      console.error('Get patient records failed:', error.message);
      throw new Error(`Failed to get patient records: ${error.message}`);
    }
  }

  /**
   * Get total number of records in the system
   * @returns {number} Total record count
   */
  async getTotalRecords() {
    try {
      this._ensureContract();
      
      const total = await this.contract.getTotalRecords();
      const count = Number(total);
      
      console.log('Total records:', count);
      return count;

    } catch (error) {
      console.error('Get total records failed:', error.message);
      throw new Error(`Failed to get total records: ${error.message}`);
    }
  }

  // ============================================
  // ACCESS CONTROL METHODS
  // ============================================

  /**
   * Grant access to a provider for specific records
   * @param {string} granteeAddress - Address to grant access to
   * @param {Array} recordIds - Array of record IDs
   * @param {number} durationInDays - Duration in days
   * @returns {Object} Transaction result
   */
  async grantAccess(granteeAddress, recordIds, durationInDays) {
    try {
      this._ensureContract();
      
      console.log('Granting access:', {
        grantee: granteeAddress,
        recordIds,
        durationInDays
      });

      const tx = await this.contract.grantAccess(granteeAddress, recordIds, durationInDays);
      console.log('Transaction sent:', tx.hash);
      
      const receipt = await tx.wait();
      console.log('Transaction confirmed in block:', receipt.blockNumber);

      return {
        success: true,
        hash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };

    } catch (error) {
      console.error('Grant access failed:', error.message);
      throw new Error(`Failed to grant access: ${error.message}`);
    }
  }

  /**
   * Revoke provider access
   * @param {string} granteeAddress - Address to revoke access from
   * @returns {Object} Transaction result
   */
  async revokeAccess(granteeAddress) {
    try {
      this._ensureContract();
      
      console.log('Revoking access from:', granteeAddress);

      const tx = await this.contract.revokeAccess(granteeAddress);
      console.log('Transaction sent:', tx.hash);
      
      const receipt = await tx.wait();
      console.log('Transaction confirmed in block:', receipt.blockNumber);

      return {
        success: true,
        hash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };

    } catch (error) {
      console.error('Revoke access failed:', error.message);
      throw new Error(`Failed to revoke access: ${error.message}`);
    }
  }

  /**
   * Check if requester has access to a record
   * @param {string} patientAddress - Patient's address
   * @param {string} requesterAddress - Requester's address
   * @param {number} recordId - Record ID
   * @returns {boolean} True if requester has valid access
   */
  async hasAccess(patientAddress, requesterAddress, recordId) {
    try {
      this._ensureContract();
      
      console.log('Checking access:', { patient: patientAddress, requester: requesterAddress, recordId });
      const hasAccess = await this.contract.hasAccess(patientAddress, requesterAddress, recordId);
      
      console.log('Access granted:', hasAccess);
      return hasAccess;

    } catch (error) {
      console.error('Check access failed:', error.message);
      throw new Error(`Failed to check access: ${error.message}`);
    }
  }

  /**
   * Get access grant details
   * @param {string} patientAddress - Patient's address
   * @param {string} granteeAddress - Grantee's address
   * @returns {Object} Access grant information
   */
  async getAccessGrant(patientAddress, granteeAddress) {
    try {
      this._ensureContract();
      
      console.log('Fetching access grant:', { patient: patientAddress, grantee: granteeAddress });
      const grant = await this.contract.getAccessGrant(patientAddress, granteeAddress);

      const formattedGrant = {
        grantedTo: grant.grantedTo,
        recordIds: grant.recordIds.map(id => Number(id)),
        expiryTime: Number(grant.expiryTime),
        expiryTimeDate: grant.expiryTime > 0 ? new Date(Number(grant.expiryTime) * 1000).toISOString() : null,
        isActive: grant.isActive,
        grantedAt: Number(grant.grantedAt),
        grantedAtDate: grant.grantedAt > 0 ? new Date(Number(grant.grantedAt) * 1000).toISOString() : null,
        isExpired: grant.isActive && Number(grant.expiryTime) < Math.floor(Date.now() / 1000)
      };

      console.log('Access grant retrieved');
      return formattedGrant;

    } catch (error) {
      console.error('Get access grant failed:', error.message);
      throw new Error(`Failed to get access grant: ${error.message}`);
    }
  }

  // ============================================
  // PROVIDER AUTHORIZATION METHODS (Admin Only)
  // ============================================

  /**
   * Authorize a provider (grant PROVIDER_ROLE)
   * @param {string} providerAddress - Provider's wallet address
   * @returns {Object} Transaction result
   */
  async authorizeProvider(providerAddress) {
    try {
      this._ensureContract();
      
      console.log('Authorizing provider:', providerAddress);

      const tx = await this.contract.authorizeProvider(providerAddress);
      console.log('Transaction sent:', tx.hash);
      
      const receipt = await tx.wait();
      console.log('Transaction confirmed in block:', receipt.blockNumber);

      return {
        success: true,
        hash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };

    } catch (error) {
      console.error('Authorize provider failed:', error.message);
      throw new Error(`Failed to authorize provider: ${error.message}`);
    }
  }

  /**
   * Revoke provider authorization (revoke PROVIDER_ROLE)
   * @param {string} providerAddress - Provider's wallet address
   * @returns {Object} Transaction result
   */
  async revokeProviderAuthorization(providerAddress) {
    try {
      this._ensureContract();
      
      console.log('Revoking provider authorization:', providerAddress);

      const tx = await this.contract.revokeProviderAuthorization(providerAddress);
      console.log('Transaction sent:', tx.hash);
      
      const receipt = await tx.wait();
      console.log('Transaction confirmed in block:', receipt.blockNumber);

      return {
        success: true,
        hash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };

    } catch (error) {
      console.error('Revoke provider authorization failed:', error.message);
      throw new Error(`Failed to revoke provider authorization: ${error.message}`);
    }
  }

  /**
   * Check if address has PROVIDER_ROLE
   * @param {string} providerAddress - Provider's wallet address
   * @returns {boolean} True if authorized provider
   */
  async isAuthorizedProvider(providerAddress) {
    try {
      this._ensureContract();
      
      console.log('Checking provider authorization:', providerAddress);
      const isAuthorized = await this.contract.isAuthorizedProvider(providerAddress);
      
      console.log('Provider authorized:', isAuthorized);
      return isAuthorized;

    } catch (error) {
      console.error('Check provider authorization failed:', error.message);
      throw new Error(`Failed to check provider authorization: ${error.message}`);
    }
  }

  // ============================================
  // EMERGENCY CONTACT METHODS
  // ============================================

  /**
   * Set emergency contact for the caller
   * @param {string} emergencyContactAddress - Emergency contact's wallet address
   * @returns {Object} Transaction result
   */
  async setEmergencyContact(emergencyContactAddress) {
    try {
      this._ensureContract();
      
      console.log('Setting emergency contact:', emergencyContactAddress);

      const tx = await this.contract.setEmergencyContact(emergencyContactAddress);
      console.log('Transaction sent:', tx.hash);
      
      const receipt = await tx.wait();
      console.log('Transaction confirmed in block:', receipt.blockNumber);

      return {
        success: true,
        hash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };

    } catch (error) {
      console.error('Set emergency contact failed:', error.message);
      throw new Error(`Failed to set emergency contact: ${error.message}`);
    }
  }

  /**
   * Get emergency contact for a patient
   * @param {string} patientAddress - Patient's wallet address
   * @returns {string} Emergency contact address
   */
  async getEmergencyContact(patientAddress) {
    try {
      this._ensureContract();
      
      console.log('Fetching emergency contact for:', patientAddress);
      const emergencyContact = await this.contract.emergencyContact(patientAddress);
      
      console.log('Emergency contact:', emergencyContact);
      return emergencyContact;

    } catch (error) {
      console.error('Get emergency contact failed:', error.message);
      throw new Error(`Failed to get emergency contact: ${error.message}`);
    }
  }

  // ============================================
  // AUDIT LOGGING METHODS
  // ============================================

  /**
   * Log an access action for a record
   * @param {number} recordId - Record ID
   * @param {number} action - Audit action (0-4)
   * @returns {Object} Transaction result
   */
  async logAccess(recordId, action) {
    try {
      this._ensureContract();
      
      console.log('Logging access:', {
        recordId,
        action: this._getAuditActionName(action)
      });

      const tx = await this.contract.logAccess(recordId, action);
      console.log('Transaction sent:', tx.hash);
      
      const receipt = await tx.wait();
      console.log('Transaction confirmed in block:', receipt.blockNumber);

      return {
        success: true,
        hash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };

    } catch (error) {
      console.error('Log access failed:', error.message);
      throw new Error(`Failed to log access: ${error.message}`);
    }
  }

  /**
   * Get audit logs for a record
   * @param {number} recordId - Record ID
   * @returns {Array} Array of audit log entries
   */
  async getAuditLogs(recordId) {
    try {
      this._ensureContract();
      
      console.log('Fetching audit logs for record:', recordId);
      const logs = await this.contract.getAuditLogs(recordId);

      const formattedLogs = logs.map(log => ({
        accessor: log.accessor,
        timestamp: Number(log.timestamp),
        timestampDate: new Date(Number(log.timestamp) * 1000).toISOString(),
        action: Number(log.action),
        actionName: this._getAuditActionName(Number(log.action))
      }));

      console.log('Audit logs retrieved:', formattedLogs.length);
      return formattedLogs;

    } catch (error) {
      console.error('Get audit logs failed:', error.message);
      throw new Error(`Failed to get audit logs: ${error.message}`);
    }
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

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

  /**
   * Get record type name from enum value
   * @private
   * @param {number} recordType - Record type enum (0-5)
   * @returns {string} Record type name
   */
  _getRecordTypeName(recordType) {
    const types = ['LAB_REPORT', 'PRESCRIPTION', 'MEDICAL_IMAGE', 'DIAGNOSIS', 'VACCINATION', 'VISIT_SUMMARY'];
    return types[recordType] || 'UNKNOWN';
  }

  /**
   * Get audit action name from enum value
   * @private
   * @param {number} action - Audit action enum (0-4)
   * @returns {string} Action name
   */
  _getAuditActionName(action) {
    const actions = ['VIEW', 'DOWNLOAD', 'SHARE', 'UPDATE', 'DELETE'];
    return actions[action] || 'UNKNOWN';
  }
}

// ============================================
// EXPORT SINGLETON INSTANCE
// ============================================
module.exports = new BlockchainService();
