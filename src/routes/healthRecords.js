const express = require('express');
const router = express.Router();
const blockchainService = require('../services/blockchainService');

// ============================================
// HEALTH RECORD TEST ENDPOINTS
// ============================================

/**
 * Test: Add a health record (patient adds their own)
 * GET /api/records/test-add
 */
router.get('/test-add', async (req, res) => {
  try {
    console.log('Testing addRecord...');

    const result = await blockchainService.addRecord(
      'QmTestHash123456789',  // IPFS hash
      0,                       // RecordType: LAB_REPORT
      'encryptedKey123456'     // Encrypted key
    );

    res.json({
      success: true,
      message: 'Record added successfully',
      data: result
    });

  } catch (error) {
    console.error('Test addRecord failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Test: Add record by provider (hospital adds for patient)
 * GET /api/records/test-add-by-provider/:patientAddress
 */
router.get('/test-add-by-provider/:patientAddress', async (req, res) => {
  try {
    const { patientAddress } = req.params;
    console.log('Testing addRecordByProvider for:', patientAddress);

    const result = await blockchainService.addRecordByProvider(
      patientAddress,
      'QmProviderHash123456',
      1,  // RecordType: PRESCRIPTION
      'providerEncryptedKey'
    );

    res.json({
      success: true,
      message: 'Record added by provider successfully',
      data: result
    });

  } catch (error) {
    console.error('Test addRecordByProvider failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Test: Get a specific record
 * GET /api/records/test-get/:recordId
 */
router.get('/test-get/:recordId', async (req, res) => {
  try {
    const recordId = parseInt(req.params.recordId, 10);
    
    if (isNaN(recordId) || recordId < 1) {
      return res.status(400).json({
        success: false,
        error: `Invalid record ID: ${req.params.recordId}. Must be a positive number.`
      });
    }
    
    console.log('Testing getRecord for ID:', recordId);

    const record = await blockchainService.getRecord(recordId);

    res.json({
      success: true,
      message: 'Record retrieved successfully',
      data: record
    });

  } catch (error) {
    console.error('Test getRecord failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Test: Get all records for a patient
 * GET /api/records/test-patient/:patientAddress
 */
router.get('/test-patient/:patientAddress', async (req, res) => {
  try {
    const { patientAddress } = req.params;
    console.log('Testing getPatientRecords for:', patientAddress);

    const recordIds = await blockchainService.getPatientRecords(patientAddress);

    res.json({
      success: true,
      message: `Found ${recordIds.length} records`,
      data: {
        patientAddress,
        recordIds,
        count: recordIds.length
      }
    });

  } catch (error) {
    console.error('Test getPatientRecords failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Test: Update a record
 * GET /api/records/test-update/:recordId
 */
router.get('/test-update/:recordId', async (req, res) => {
  try {
    const recordId = parseInt(req.params.recordId);
    console.log('Testing updateRecord for ID:', recordId);

    const result = await blockchainService.updateRecord(
      recordId,
      'QmUpdatedHash123456',
      'updatedEncryptedKey'
    );

    res.json({
      success: true,
      message: 'Record updated successfully',
      data: result
    });

  } catch (error) {
    console.error('Test updateRecord failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Test: Delete a record (soft delete)
 * GET /api/records/test-delete/:recordId
 */
router.get('/test-delete/:recordId', async (req, res) => {
  try {
    const recordId = parseInt(req.params.recordId);
    console.log('Testing deleteRecord for ID:', recordId);

    const result = await blockchainService.deleteRecord(recordId);

    res.json({
      success: true,
      message: 'Record deleted successfully',
      data: result
    });

  } catch (error) {
    console.error('Test deleteRecord failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Test: Get total records in system
 * GET /api/records/test-total
 */
router.get('/test-total', async (req, res) => {
  try {
    console.log('Testing getTotalRecords...');

    const total = await blockchainService.getTotalRecords();

    res.json({
      success: true,
      message: 'Total records retrieved',
      data: {
        totalRecords: total
      }
    });

  } catch (error) {
    console.error('Test getTotalRecords failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// ACCESS CONTROL TEST ENDPOINTS
// ============================================

/**
 * Test: Grant access to a provider
 * GET /api/records/test-grant/:granteeAddress/:recordId
 */
router.get('/test-grant/:granteeAddress/:recordId', async (req, res) => {
  try {
    const recordId = parseInt(req.params.recordId);
    const { granteeAddress } = req.params;
    
    // Grant for 30 days
    const durationInDays = 30;
    
    console.log('Testing grantAccess...');

    const result = await blockchainService.grantAccess(
      granteeAddress,
      [recordId],  // Array of record IDs
      durationInDays
    );

    res.json({
      success: true,
      message: 'Access granted successfully',
      data: result
    });

  } catch (error) {
    console.error('Test grantAccess failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Test: Revoke access from a provider
 * GET /api/records/test-revoke/:granteeAddress
 */
router.get('/test-revoke/:granteeAddress', async (req, res) => {
  try {
    const { granteeAddress } = req.params;
    
    console.log('Testing revokeAccess...');

    const result = await blockchainService.revokeAccess(granteeAddress);

    res.json({
      success: true,
      message: 'Access revoked successfully',
      data: result
    });

  } catch (error) {
    console.error('Test revokeAccess failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Test: Check if provider has access
 * GET /api/records/test-has-access/:patientAddress/:granteeAddress/:recordId
 */
router.get('/test-has-access/:patientAddress/:granteeAddress/:recordId', async (req, res) => {
  try {
    const recordId = parseInt(req.params.recordId);
    const { patientAddress, granteeAddress } = req.params;
    
    console.log('Testing hasAccess...');

    const hasAccess = await blockchainService.hasAccess(
      patientAddress,
      granteeAddress,
      recordId
    );

    res.json({
      success: true,
      message: 'Access check completed',
      data: {
        patientAddress,
        granteeAddress,
        recordId,
        hasAccess
      }
    });

  } catch (error) {
    console.error('Test hasAccess failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Test: Get access grant details
 * GET /api/records/test-access-grant/:patientAddress/:granteeAddress
 */
router.get('/test-access-grant/:patientAddress/:granteeAddress', async (req, res) => {
  try {
    const { patientAddress, granteeAddress } = req.params;
    
    console.log('Testing getAccessGrant...');

    const grant = await blockchainService.getAccessGrant(
      patientAddress,
      granteeAddress
    );

    res.json({
      success: true,
      message: 'Access grant details retrieved',
      data: grant
    });

  } catch (error) {
    console.error('Test getAccessGrant failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// PROVIDER AUTHORIZATION TEST ENDPOINTS (Admin Only)
// ============================================

/**
 * Test: Authorize a provider (grant PROVIDER_ROLE)
 * GET /api/records/test-authorize-provider/:providerAddress
 */
router.get('/test-authorize-provider/:providerAddress', async (req, res) => {
  try {
    const { providerAddress } = req.params;
    
    console.log('Testing authorizeProvider...');

    const result = await blockchainService.authorizeProvider(providerAddress);

    res.json({
      success: true,
      message: 'Provider authorized successfully',
      data: result
    });

  } catch (error) {
    console.error('Test authorizeProvider failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Test: Revoke provider authorization
 * GET /api/records/test-revoke-provider/:providerAddress
 */
router.get('/test-revoke-provider/:providerAddress', async (req, res) => {
  try {
    const { providerAddress } = req.params;
    
    console.log('Testing revokeProviderAuthorization...');

    const result = await blockchainService.revokeProviderAuthorization(providerAddress);

    res.json({
      success: true,
      message: 'Provider authorization revoked',
      data: result
    });

  } catch (error) {
    console.error('Test revokeProviderAuthorization failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Test: Check if address is authorized provider
 * GET /api/records/test-is-provider/:providerAddress
 */
router.get('/test-is-provider/:providerAddress', async (req, res) => {
  try {
    const { providerAddress } = req.params;
    
    console.log('Testing isAuthorizedProvider...');

    const isAuthorized = await blockchainService.isAuthorizedProvider(providerAddress);

    res.json({
      success: true,
      message: 'Provider authorization check completed',
      data: {
        providerAddress,
        isAuthorized
      }
    });

  } catch (error) {
    console.error('Test isAuthorizedProvider failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// EMERGENCY CONTACT TEST ENDPOINTS
// ============================================

/**
 * Test: Set emergency contact
 * GET /api/records/test-emergency-set/:emergencyAddress
 */
router.get('/test-emergency-set/:emergencyAddress', async (req, res) => {
  try {
    const { emergencyAddress } = req.params;
    
    console.log('Testing setEmergencyContact...');

    const result = await blockchainService.setEmergencyContact(emergencyAddress);

    res.json({
      success: true,
      message: 'Emergency contact set successfully',
      data: result
    });

  } catch (error) {
    console.error('Test setEmergencyContact failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Test: Get emergency contact for a patient
 * GET /api/records/test-emergency-get/:patientAddress
 */
router.get('/test-emergency-get/:patientAddress', async (req, res) => {
  try {
    const { patientAddress } = req.params;
    
    console.log('Testing getEmergencyContact...');

    const emergencyContact = await blockchainService.getEmergencyContact(patientAddress);

    res.json({
      success: true,
      message: 'Emergency contact retrieved',
      data: {
        patientAddress,
        emergencyContact
      }
    });

  } catch (error) {
    console.error('Test getEmergencyContact failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// AUDIT LOG TEST ENDPOINTS
// ============================================

/**
 * Test: Log an access action
 * GET /api/records/test-log-access/:recordId/:action
 * Actions: 0=VIEW, 1=DOWNLOAD, 2=SHARE, 3=UPDATE, 4=DELETE
 */
router.get('/test-log-access/:recordId/:action', async (req, res) => {
  try {
    const recordId = parseInt(req.params.recordId);
    const action = parseInt(req.params.action);
    
    console.log('Testing logAccess...');

    const result = await blockchainService.logAccess(recordId, action);

    res.json({
      success: true,
      message: 'Access logged successfully',
      data: result
    });

  } catch (error) {
    console.error('Test logAccess failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Test: Get audit logs for a record
 * GET /api/records/test-audit-logs/:recordId
 */
router.get('/test-audit-logs/:recordId', async (req, res) => {
  try {
    const recordId = parseInt(req.params.recordId);
    
    console.log('Testing getAuditLogs...');

    const logs = await blockchainService.getAuditLogs(recordId);

    res.json({
      success: true,
      message: `Retrieved ${logs.length} audit logs`,
      data: {
        recordId,
        logs,
        count: logs.length
      }
    });

  } catch (error) {
    console.error('Test getAuditLogs failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// UTILITY ENDPOINTS
// ============================================

/**
 * Get all available test endpoints
 * GET /api/records/test-menu
 */
router.get('/test-menu', (req, res) => {
  res.json({
    success: true,
    message: 'Available test endpoints for HealthWallet',
    endpoints: {
      healthRecords: [
        'GET /api/records/test-add - Add a health record',
        'GET /api/records/test-add-by-provider/:patientAddress - Provider adds record',
        'GET /api/records/test-get/:recordId - Get specific record',
        'GET /api/records/test-patient/:patientAddress - Get all patient records',
        'GET /api/records/test-update/:recordId - Update a record',
        'GET /api/records/test-delete/:recordId - Delete a record',
        'GET /api/records/test-total - Get total records count'
      ],
      accessControl: [
        'GET /api/records/test-grant/:granteeAddress/:recordId - Grant 30-day access',
        'GET /api/records/test-revoke/:granteeAddress - Revoke access',
        'GET /api/records/test-has-access/:patientAddress/:granteeAddress/:recordId - Check access',
        'GET /api/records/test-access-grant/:patientAddress/:granteeAddress - Get grant details'
      ],
      providerAuth: [
        'GET /api/records/test-authorize-provider/:providerAddress - Authorize provider',
        'GET /api/records/test-revoke-provider/:providerAddress - Revoke provider',
        'GET /api/records/test-is-provider/:providerAddress - Check provider status'
      ],
      emergencyContact: [
        'GET /api/records/test-emergency-set/:emergencyAddress - Set emergency contact',
        'GET /api/records/test-emergency-get/:patientAddress - Get emergency contact'
      ],
      auditLogs: [
        'GET /api/records/test-log-access/:recordId/:action - Log access (0-4)',
        'GET /api/records/test-audit-logs/:recordId - Get audit logs'
      ]
    },
    enums: {
      RecordType: {
        LAB_REPORT: 0,
        PRESCRIPTION: 1,
        DIAGNOSIS: 2,
        SCAN_IMAGE: 3,
        VACCINATION: 4,
        OTHER: 5
      },
      AuditAction: {
        VIEW: 0,
        DOWNLOAD: 1,
        SHARE: 2,
        UPDATE: 3,
        DELETE: 4
      }
    }
  });
});

module.exports = router;
