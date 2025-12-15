const { ethers } = require('ethers');

/**
 * Blockchain Service for HealthWalletV2 Smart Contract
 * Handles all smart contract interactions using Ethers.js v6
 * Supports personal info, medications, vaccinations, reports, data sharing, and access logs
 * 
 * CONTRACT: HealthWalletV2 (Privacy-focused with per-category encryption)
 * NETWORK: Sepolia Testnet
 */
class BlockchainService {
  constructor() {
    // ============================================
    // STEP 1: Connect to Blockchain Network
    // ============================================
    const rpcUrl = process.env.RPC_URL || 'https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161';
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    
    const networkType = rpcUrl.includes('127.0.0.1') ? 'Local' : 
                       rpcUrl.includes('sepolia') ? 'Sepolia Testnet' :
                       rpcUrl.includes('amoy') ? 'Polygon Amoy' : 'Unknown';
    console.log('✓ Connected to blockchain:', networkType);

    // ============================================
    // STEP 2: Initialize Admin Wallet (OPTIONAL - for role management only)
    // ============================================
    if (process.env.ADMIN_PRIVATE_KEY && process.env.ADMIN_PRIVATE_KEY.length > 10) {
      this.adminWallet = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY, this.provider);
      console.log('✓ Admin wallet initialized:', this.adminWallet.address);
    } else {
      console.log('ℹ Admin wallet not configured (read-only mode)');
    }

    // ============================================
    // STEP 3: Configure Smart Contract
    // ============================================
    this.contractAddress = process.env.CONTRACT_ADDRESS;
    console.log('✓ Contract address:', this.contractAddress);
    
    /**
     * HealthWalletV2 Contract ABI
     * Privacy-focused contract with per-category encryption
     */
    this.contractABI = [
      // Personal Info Functions
      "function setPersonalInfo(string _encryptedDataIpfsHash, bytes32 _publicKeyHash) external",
      "function getPersonalInfoRef(address _user) external view returns (tuple(string encryptedDataIpfsHash, bytes32 publicKeyHash, uint256 createdAt, uint256 lastUpdated, bool exists))",
      "function hasPersonalInfo(address _user) external view returns (bool)",
      
      // Medication Functions
      "function addMedication(string _encryptedDataIpfsHash, bool _isActive, uint256 _startDate, uint256 _endDate) external returns (uint256)",
      "function updateMedication(uint256 _medicationId, string _encryptedDataIpfsHash, bool _isActive, uint256 _startDate, uint256 _endDate) external",
      "function getMedicationIds(address _user) external view returns (uint256[])",
      "function getMedicationRef(uint256 _medicationId) external view returns (tuple(uint256 id, string encryptedDataIpfsHash, bool isActive, uint256 startDate, uint256 endDate, uint256 createdAt))",
      
      // Vaccination Functions
      "function addVaccination(string _encryptedDataIpfsHash, string _encryptedCertificateIpfsHash, uint256 _vaccinationDate) external returns (uint256)",
      "function updateVaccination(uint256 _vaccinationId, string _encryptedDataIpfsHash, string _encryptedCertificateIpfsHash, uint256 _vaccinationDate) external",
      "function getVaccinationIds(address _user) external view returns (uint256[])",
      "function getVaccinationRef(uint256 _vaccinationId) external view returns (tuple(uint256 id, string encryptedDataIpfsHash, string encryptedCertificateIpfsHash, uint256 vaccinationDate, uint256 createdAt))",
      
      // Medical Report Functions
      "function addReport(string _encryptedDataIpfsHash, string _encryptedFileIpfsHash, uint8 _reportType, bool _hasFile, uint256 _reportDate) external returns (uint256)",
      "function updateReport(uint256 _reportId, string _encryptedDataIpfsHash, string _encryptedFileIpfsHash, uint8 _reportType, bool _hasFile, uint256 _reportDate) external",
      "function getReportIds(address _user) external view returns (uint256[])",
      "function getReportRef(uint256 _reportId) external view returns (tuple(uint256 id, string encryptedDataIpfsHash, string encryptedFileIpfsHash, uint8 reportType, bool hasFile, uint256 reportDate, uint256 createdAt))",
      
      // Data Sharing Functions
      "function shareData(address _recipientAddress, bytes32 _recipientNameHash, string _encryptedRecipientDataIpfsHash, uint8 _recipientType, uint8 _dataCategory, uint256 _expiryDate, uint8 _accessLevel, string _encryptedCategoryKey) external returns (uint256)",
      "function revokeShare(uint256 _shareId) external",
      "function getShareIds(address _user) external view returns (uint256[])",
      "function getShareRecord(uint256 _shareId) external view returns (tuple(uint256 id, address recipientAddress, bytes32 recipientNameHash, string encryptedRecipientDataIpfsHash, uint8 recipientType, uint8 sharedDataCategory, uint256 shareDate, uint256 expiryDate, uint8 accessLevel, uint8 status, string encryptedCategoryKey))",
      
      // Access Logging Functions
      "function logDataAccess(address _owner, string _encryptedDetailsIpfsHash, uint8 _accessedCategory, bytes32 _dataIntegrityHash) external returns (uint256)",
      "function getAccessLogIds(address _user) external view returns (uint256[])",
      "function getAccessLog(uint256 _logId) external view returns (tuple(uint256 id, address accessorAddress, string encryptedDetailsIpfsHash, uint8 accessedCategory, uint256 accessTime, bytes32 dataIntegrityHash))",
      
      // Emergency Contact
      "function setEmergencyContact(address _emergencyContact) external",
      "function getEmergencyContact(address _user) external view returns (address)",
      
      // Admin Functions (require DEFAULT_ADMIN_ROLE)
      "function registerHealthcareProvider(address _provider) external",
      "function registerHospital(address _hospital) external",
      "function registerClinic(address _clinic) external",
      "function registerInsurance(address _insurance) external",
      "function registerAuditor(address _auditor) external",
      "function revokeEntityRole(address _entity, bytes32 _role) external",
      "function pause() external",
      "function unpause() external",
      
      // Utility Functions
      "function getTotalCounts() external view returns (uint256 medications, uint256 vaccinations, uint256 reports, uint256 shares, uint256 totalAccessLogs)",
      
      // OpenZeppelin AccessControl
      "function hasRole(bytes32 role, address account) external view returns (bool)",
      "function DEFAULT_ADMIN_ROLE() external pure returns (bytes32)",
      "function HEALTHCARE_PROVIDER_ROLE() external pure returns (bytes32)",
      "function HOSPITAL_ROLE() external pure returns (bytes32)",
      "function CLINIC_ROLE() external pure returns (bytes32)",
      "function INSURANCE_ROLE() external pure returns (bytes32)",
      "function AUDITOR_ROLE() external pure returns (bytes32)",
      
      // OpenZeppelin Ownable
      "function owner() external view returns (address)",
      
      // Events
      "event PersonalInfoStored(address indexed user, string ipfsHash, uint256 timestamp)",
      "event PersonalInfoUpdated(address indexed user, string ipfsHash, uint256 timestamp)",
      "event MedicationAdded(address indexed user, uint256 indexed medicationId, string ipfsHash)",
      "event MedicationUpdated(address indexed user, uint256 indexed medicationId, string ipfsHash)",
      "event VaccinationAdded(address indexed user, uint256 indexed vaccinationId, string ipfsHash)",
      "event VaccinationUpdated(address indexed user, uint256 indexed vaccinationId, string ipfsHash)",
      "event ReportAdded(address indexed user, uint256 indexed reportId, uint8 reportType, string ipfsHash)",
      "event ReportUpdated(address indexed user, uint256 indexed reportId, string ipfsHash)",
      "event DataShared(address indexed owner, address indexed recipient, uint256 indexed shareId, uint8 category, uint256 expiryDate)",
      "event ShareRevoked(address indexed owner, uint256 indexed shareId)",
      "event DataAccessed(address indexed owner, address indexed accessor, uint256 indexed logId, uint8 category, uint256 timestamp)"
    ];

    // ============================================
    // STEP 4: Define Enums (matching Solidity)
    // ============================================
    this.DataCategory = {
      PERSONAL_INFO: 0,
      MEDICATION_RECORDS: 1,
      VACCINATION_RECORDS: 2,
      MEDICAL_REPORTS: 3,
      ALL_DATA: 4
    };

    this.ReportType = {
      LAB_RESULT: 0,
      DOCTOR_NOTE: 1,
      PRESCRIPTION: 2,
      IMAGING: 3,
      PATHOLOGY: 4,
      CONSULTATION: 5,
      DISCHARGE_SUMMARY: 6,
      OTHER: 7
    };

    this.RecipientType = {
      DOCTOR: 0,
      HOSPITAL: 1,
      CLINIC: 2,
      INSURANCE_COMPANY: 3,
      PHARMACY: 4,
      LABORATORY: 5,
      OTHER: 6
    };

    this.AccessLevel = {
      VIEW_ONLY: 0,
      FULL_ACCESS: 1,
      EMERGENCY_ONLY: 2
    };

    this.ShareStatus = {
      ACTIVE: 0,
      EXPIRED: 1,
      REVOKED: 2
    };

    // ============================================
    // STEP 5: Initialize Contract Instance
    // ============================================
    if (this.contractAddress) {
      // Read-only contract (no signer needed for view functions)
      this.contract = new ethers.Contract(
        this.contractAddress,
        this.contractABI,
        this.provider
      );
      console.log('✓ HealthWalletV2 contract initialized (read-only)');
      
      // Admin contract (for admin operations - optional)
      if (this.adminWallet) {
        this.adminContract = new ethers.Contract(
          this.contractAddress,
          this.contractABI,
          this.adminWallet
        );
        console.log('✓ Admin contract initialized for role management');
      }
    } else {
      console.warn('⚠ Contract not initialized. Check CONTRACT_ADDRESS in .env');
    }
  }

  // ============================================
  // VIEW FUNCTIONS (Read-only - No gas fees)
  // Backend reads blockchain data
  // User transactions signed in Android app
  // ============================================

  async hasPersonalInfo(userAddress) {
    try {
      this._ensureContract();
      return await this.contract.hasPersonalInfo(userAddress);
    } catch (error) {
      throw new Error(`Failed to check personal info: ${error.message}`);
    }
  }

  async getPersonalInfoRef(userAddress) {
    try {
      this._ensureContract();
      const info = await this.contract.getPersonalInfoRef(userAddress);
      return {
        encryptedDataIpfsHash: info.encryptedDataIpfsHash,
        publicKeyHash: info.publicKeyHash,
        createdAt: Number(info.createdAt),
        lastUpdated: Number(info.lastUpdated),
        exists: info.exists
      };
    } catch (error) {
      throw new Error(`Failed to get personal info: ${error.message}`);
    }
  }

  async getMedicationIds(userAddress) {
    try {
      this._ensureContract();
      const ids = await this.contract.getMedicationIds(userAddress);
      return ids.map(id => Number(id));
    } catch (error) {
      throw new Error(`Failed to get medication IDs: ${error.message}`);
    }
  }

  async getMedicationRef(medicationId) {
    try {
      this._ensureContract();
      const med = await this.contract.getMedicationRef(medicationId);
      return {
        id: Number(med.id),
        encryptedDataIpfsHash: med.encryptedDataIpfsHash,
        isActive: med.isActive,
        startDate: Number(med.startDate),
        endDate: Number(med.endDate),
        createdAt: Number(med.createdAt)
      };
    } catch (error) {
      throw new Error(`Failed to get medication: ${error.message}`);
    }
  }

  async getVaccinationIds(userAddress) {
    try {
      this._ensureContract();
      const ids = await this.contract.getVaccinationIds(userAddress);
      return ids.map(id => Number(id));
    } catch (error) {
      throw new Error(`Failed to get vaccination IDs: ${error.message}`);
    }
  }

  async getVaccinationRef(vaccinationId) {
    try {
      this._ensureContract();
      const vac = await this.contract.getVaccinationRef(vaccinationId);
      return {
        id: Number(vac.id),
        encryptedDataIpfsHash: vac.encryptedDataIpfsHash,
        encryptedCertificateIpfsHash: vac.encryptedCertificateIpfsHash,
        vaccinationDate: Number(vac.vaccinationDate),
        createdAt: Number(vac.createdAt)
      };
    } catch (error) {
      throw new Error(`Failed to get vaccination: ${error.message}`);
    }
  }

  async getReportIds(userAddress) {
    try {
      this._ensureContract();
      const ids = await this.contract.getReportIds(userAddress);
      return ids.map(id => Number(id));
    } catch (error) {
      throw new Error(`Failed to get report IDs: ${error.message}`);
    }
  }

  async getReportRef(reportId) {
    try {
      this._ensureContract();
      const report = await this.contract.getReportRef(reportId);
      return {
        id: Number(report.id),
        encryptedDataIpfsHash: report.encryptedDataIpfsHash,
        encryptedFileIpfsHash: report.encryptedFileIpfsHash,
        reportType: Number(report.reportType),
        hasFile: report.hasFile,
        reportDate: Number(report.reportDate),
        createdAt: Number(report.createdAt)
      };
    } catch (error) {
      throw new Error(`Failed to get report: ${error.message}`);
    }
  }

  async getShareIds(userAddress) {
    try {
      this._ensureContract();
      const ids = await this.contract.getShareIds(userAddress);
      return ids.map(id => Number(id));
    } catch (error) {
      throw new Error(`Failed to get share IDs: ${error.message}`);
    }
  }

  async getShareRecord(shareId) {
    try {
      this._ensureContract();
      const share = await this.contract.getShareRecord(shareId);
      return {
        id: Number(share.id),
        recipientAddress: share.recipientAddress,
        recipientNameHash: share.recipientNameHash,
        encryptedRecipientDataIpfsHash: share.encryptedRecipientDataIpfsHash,
        recipientType: Number(share.recipientType),
        sharedDataCategory: Number(share.sharedDataCategory),
        shareDate: Number(share.shareDate),
        expiryDate: Number(share.expiryDate),
        accessLevel: Number(share.accessLevel),
        status: Number(share.status),
        encryptedCategoryKey: share.encryptedCategoryKey
      };
    } catch (error) {
      throw new Error(`Failed to get share record: ${error.message}`);
    }
  }

  async getAccessLogIds(userAddress) {
    try {
      this._ensureContract();
      const ids = await this.contract.getAccessLogIds(userAddress);
      return ids.map(id => Number(id));
    } catch (error) {
      throw new Error(`Failed to get access log IDs: ${error.message}`);
    }
  }

  async getAccessLog(logId) {
    try {
      this._ensureContract();
      const log = await this.contract.getAccessLog(logId);
      return {
        id: Number(log.id),
        accessorAddress: log.accessorAddress,
        encryptedDetailsIpfsHash: log.encryptedDetailsIpfsHash,
        accessedCategory: Number(log.accessedCategory),
        accessTime: Number(log.accessTime),
        dataIntegrityHash: log.dataIntegrityHash
      };
    } catch (error) {
      throw new Error(`Failed to get access log: ${error.message}`);
    }
  }

  async getTotalCounts() {
    try {
      this._ensureContract();
      const counts = await this.contract.getTotalCounts();
      return {
        medications: Number(counts.medications),
        vaccinations: Number(counts.vaccinations),
        reports: Number(counts.reports),
        shares: Number(counts.shares),
        accessLogs: Number(counts.totalAccessLogs)
      };
    } catch (error) {
      throw new Error(`Failed to get counts: ${error.message}`);
    }
  }

  async getEmergencyContact(userAddress) {
    try {
      this._ensureContract();
      return await this.contract.getEmergencyContact(userAddress);
    } catch (error) {
      throw new Error(`Failed to get emergency contact: ${error.message}`);
    }
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  async getBalance(address) {
    try {
      const balance = await this.provider.getBalance(address);
      return ethers.formatEther(balance);
    } catch (error) {
      throw new Error(`Failed to get balance: ${error.message}`);
    }
  }

  async getGasPrice() {
    try {
      const feeData = await this.provider.getFeeData();
      return {
        gasPrice: feeData.gasPrice ? ethers.formatUnits(feeData.gasPrice, 'gwei') + ' gwei' : 'N/A',
        maxFeePerGas: feeData.maxFeePerGas ? ethers.formatUnits(feeData.maxFeePerGas, 'gwei') + ' gwei' : 'N/A'
      };
    } catch (error) {
      throw new Error(`Failed to get gas price: ${error.message}`);
    }
  }

  async getBlockNumber() {
    try {
      return await this.provider.getBlockNumber();
    } catch (error) {
      throw new Error(`Failed to get block number: ${error.message}`);
    }
  }

  async getNetwork() {
    try {
      const network = await this.provider.getNetwork();
      return {
        name: network.name,
        chainId: Number(network.chainId)
      };
    } catch (error) {
      throw new Error(`Failed to get network: ${error.message}`);
    }
  }

  _ensureContract() {
    if (!this.contract) {
      throw new Error('Contract not initialized. Check CONTRACT_ADDRESS in .env');
    }
  }
}

// ============================================
// EXPORT SINGLETON INSTANCE
// ============================================
module.exports = new BlockchainService();
