// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title HealthWallet
 * @dev Decentralized health record management with role-based access control
 */
contract HealthWallet is Ownable, AccessControl {
    
    // ============================================
    // ROLES
    // ============================================
    bytes32 public constant PROVIDER_ROLE = keccak256("PROVIDER_ROLE");
    
    // ============================================
    // ENUMS
    // ============================================
    enum RecordType {
        LAB_REPORT,      // 0
        PRESCRIPTION,    // 1
        DIAGNOSIS,       // 2
        SCAN_IMAGE,      // 3
        VACCINATION,     // 4
        OTHER            // 5
    }
    
    enum AuditAction {
        VIEW,            // 0
        DOWNLOAD,        // 1
        SHARE,           // 2
        UPDATE,          // 3
        DELETE           // 4
    }
    
    // ============================================
    // STRUCTS
    // ============================================
    struct HealthRecord {
        uint256 id;
        address patient;
        string ipfsHash;
        RecordType recordType;
        string encryptedKey;
        uint256 timestamp;
        bool isActive;
    }
    
    struct AccessGrant {
        bool granted;
        uint256 grantedAt;
        uint256 expiresAt;
    }
    
    struct AuditLog {
        address accessor;
        AuditAction action;
        uint256 timestamp;
    }
    
    // ============================================
    // STATE VARIABLES
    // ============================================
    uint256 private recordCounter;
    
    // recordId => HealthRecord
    mapping(uint256 => HealthRecord) private records;
    
    // patient => recordIds[]
    mapping(address => uint256[]) private patientRecords;
    
    // recordId => provider => AccessGrant
    mapping(uint256 => mapping(address => AccessGrant)) private accessGrants;
    
    // patient => emergencyContact
    mapping(address => address) private emergencyContacts;
    
    // recordId => AuditLog[]
    mapping(uint256 => AuditLog[]) private auditLogs;
    
    // ============================================
    // EVENTS
    // ============================================
    event RecordAdded(uint256 indexed recordId, address indexed patient, string ipfsHash, RecordType recordType);
    event RecordUpdated(uint256 indexed recordId, string newIpfsHash);
    event RecordDeleted(uint256 indexed recordId);
    event AccessGranted(uint256 indexed recordId, address indexed provider, uint256 expiryTime);
    event AccessRevoked(uint256 indexed recordId, address indexed provider);
    event ProviderAuthorized(address indexed provider);
    event ProviderRevoked(address indexed provider);
    event EmergencyContactSet(address indexed patient, address indexed emergencyContact);
    event AccessLogged(uint256 indexed recordId, address indexed accessor, AuditAction action);
    
    // ============================================
    // CONSTRUCTOR
    // ============================================
    constructor() Ownable(msg.sender) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }
    
    // ============================================
    // MODIFIERS
    // ============================================
    modifier onlyRecordOwner(uint256 _recordId) {
        require(records[_recordId].patient == msg.sender, "Not record owner");
        _;
    }
    
    modifier recordExists(uint256 _recordId) {
        require(records[_recordId].id != 0, "Record does not exist");
        _;
    }
    
    // ============================================
    // HEALTH RECORD FUNCTIONS
    // ============================================
    
    /**
     * @dev Add a health record (patient adds their own record)
     */
    function addRecord(
        string memory _ipfsHash,
        RecordType _recordType,
        string memory _encryptedKey
    ) external returns (uint256) {
        recordCounter++;
        
        records[recordCounter] = HealthRecord({
            id: recordCounter,
            patient: msg.sender,
            ipfsHash: _ipfsHash,
            recordType: _recordType,
            encryptedKey: _encryptedKey,
            timestamp: block.timestamp,
            isActive: true
        });
        
        patientRecords[msg.sender].push(recordCounter);
        
        emit RecordAdded(recordCounter, msg.sender, _ipfsHash, _recordType);
        
        return recordCounter;
    }
    
    /**
     * @dev Provider adds a record for a patient
     */
    function addRecordByProvider(
        address _patient,
        string memory _ipfsHash,
        RecordType _recordType,
        string memory _encryptedKey
    ) external onlyRole(PROVIDER_ROLE) returns (uint256) {
        recordCounter++;
        
        records[recordCounter] = HealthRecord({
            id: recordCounter,
            patient: _patient,
            ipfsHash: _ipfsHash,
            recordType: _recordType,
            encryptedKey: _encryptedKey,
            timestamp: block.timestamp,
            isActive: true
        });
        
        patientRecords[_patient].push(recordCounter);
        
        emit RecordAdded(recordCounter, _patient, _ipfsHash, _recordType);
        
        return recordCounter;
    }
    
    /**
     * @dev Get a specific health record
     */
    function getRecord(uint256 _recordId) 
        external 
        view 
        recordExists(_recordId) 
        returns (HealthRecord memory) 
    {
        HealthRecord memory record = records[_recordId];
        
        // Check access permissions
        require(
            record.patient == msg.sender || 
            hasAccess(_recordId, msg.sender) ||
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "No access to this record"
        );
        
        return record;
    }
    
    /**
     * @dev Update a health record
     */
    function updateRecord(
        uint256 _recordId,
        string memory _newIpfsHash,
        string memory _newEncryptedKey
    ) external recordExists(_recordId) onlyRecordOwner(_recordId) {
        records[_recordId].ipfsHash = _newIpfsHash;
        records[_recordId].encryptedKey = _newEncryptedKey;
        
        emit RecordUpdated(_recordId, _newIpfsHash);
    }
    
    /**
     * @dev Delete a health record (soft delete)
     */
    function deleteRecord(uint256 _recordId) 
        external 
        recordExists(_recordId) 
        onlyRecordOwner(_recordId) 
    {
        records[_recordId].isActive = false;
        
        emit RecordDeleted(_recordId);
    }
    
    /**
     * @dev Get all record IDs for a patient
     */
    function getPatientRecords(address _patient) external view returns (uint256[] memory) {
        return patientRecords[_patient];
    }
    
    /**
     * @dev Get total number of records
     */
    function getTotalRecords() external view returns (uint256) {
        return recordCounter;
    }
    
    // ============================================
    // ACCESS CONTROL FUNCTIONS
    // ============================================
    
    /**
     * @dev Grant access to a provider for a specific record
     */
    function grantAccess(
        uint256 _recordId,
        address _provider,
        uint256 _expiryTime
    ) external recordExists(_recordId) onlyRecordOwner(_recordId) {
        require(_expiryTime > block.timestamp, "Expiry time must be in the future");
        
        accessGrants[_recordId][_provider] = AccessGrant({
            granted: true,
            grantedAt: block.timestamp,
            expiresAt: _expiryTime
        });
        
        emit AccessGranted(_recordId, _provider, _expiryTime);
    }
    
    /**
     * @dev Revoke provider access to a record
     */
    function revokeAccess(uint256 _recordId, address _provider) 
        external 
        recordExists(_recordId) 
        onlyRecordOwner(_recordId) 
    {
        delete accessGrants[_recordId][_provider];
        
        emit AccessRevoked(_recordId, _provider);
    }
    
    /**
     * @dev Check if provider has access to a record
     */
    function hasAccess(uint256 _recordId, address _provider) public view returns (bool) {
        AccessGrant memory grant = accessGrants[_recordId][_provider];
        
        if (!grant.granted) {
            return false;
        }
        
        if (block.timestamp > grant.expiresAt) {
            return false;
        }
        
        return true;
    }
    
    /**
     * @dev Get access grant details
     */
    function getAccessGrant(uint256 _recordId, address _provider) 
        external 
        view 
        returns (AccessGrant memory) 
    {
        return accessGrants[_recordId][_provider];
    }
    
    // ============================================
    // PROVIDER AUTHORIZATION (Admin Only)
    // ============================================
    
    /**
     * @dev Authorize a provider (grant PROVIDER_ROLE)
     */
    function authorizeProvider(address _provider) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(PROVIDER_ROLE, _provider);
        emit ProviderAuthorized(_provider);
    }
    
    /**
     * @dev Revoke provider authorization
     */
    function revokeProviderAuthorization(address _provider) external onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(PROVIDER_ROLE, _provider);
        emit ProviderRevoked(_provider);
    }
    
    /**
     * @dev Check if address is authorized provider
     */
    function isAuthorizedProvider(address _provider) external view returns (bool) {
        return hasRole(PROVIDER_ROLE, _provider);
    }
    
    // ============================================
    // EMERGENCY CONTACT FUNCTIONS
    // ============================================
    
    /**
     * @dev Set emergency contact
     */
    function setEmergencyContact(address _emergencyContact) external {
        emergencyContacts[msg.sender] = _emergencyContact;
        emit EmergencyContactSet(msg.sender, _emergencyContact);
    }
    
    /**
     * @dev Get emergency contact for a patient
     */
    function getEmergencyContact(address _patient) external view returns (address) {
        return emergencyContacts[_patient];
    }
    
    // ============================================
    // AUDIT LOGGING FUNCTIONS
    // ============================================
    
    /**
     * @dev Log an access action
     */
    function logAccess(uint256 _recordId, AuditAction _action) 
        external 
        recordExists(_recordId) 
    {
        auditLogs[_recordId].push(AuditLog({
            accessor: msg.sender,
            action: _action,
            timestamp: block.timestamp
        }));
        
        emit AccessLogged(_recordId, msg.sender, _action);
    }
    
    /**
     * @dev Get audit logs for a record
     */
    function getAuditLogs(uint256 _recordId) 
        external 
        view 
        recordExists(_recordId) 
        returns (AuditLog[] memory) 
    {
        require(
            records[_recordId].patient == msg.sender || 
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Not authorized to view audit logs"
        );
        
        return auditLogs[_recordId];
    }
}
