const express = require('express');
const router = express.Router();
const adminService = require('../services/adminService');

/**
 * Admin Routes
 * These endpoints require admin privileges.
 * Only the contract owner can execute these operations.
 */

/**
 * @route   POST /api/admin/authorize-provider
 * @desc    Authorize a healthcare provider (grant PROVIDER_ROLE)
 * @access  Admin only
 */
router.post('/authorize-provider', async (req, res) => {
    try {
        const { providerAddress } = req.body;
        
        if (!providerAddress) {
            return res.status(400).json({
                success: false,
                error: 'Provider address is required'
            });
        }
        
        const result = await adminService.authorizeProvider(providerAddress);
        
        res.json(result);
    } catch (error) {
        console.error('Error in authorize-provider endpoint:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to authorize provider'
        });
    }
});

/**
 * @route   POST /api/admin/revoke-provider
 * @desc    Revoke provider authorization
 * @access  Admin only
 */
router.post('/revoke-provider', async (req, res) => {
    try {
        const { providerAddress } = req.body;
        
        if (!providerAddress) {
            return res.status(400).json({
                success: false,
                error: 'Provider address is required'
            });
        }
        
        const result = await adminService.revokeProviderAuthorization(providerAddress);
        
        res.json(result);
    } catch (error) {
        console.error('Error in revoke-provider endpoint:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to revoke provider authorization'
        });
    }
});

/**
 * @route   GET /api/admin/is-provider/:address
 * @desc    Check if an address is an authorized provider
 * @access  Public (read-only)
 */
router.get('/is-provider/:address', async (req, res) => {
    try {
        const { address } = req.params;
        
        const isProvider = await adminService.isAuthorizedProvider(address);
        
        res.json({
            success: true,
            address: address,
            isProvider: isProvider
        });
    } catch (error) {
        console.error('Error in is-provider endpoint:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to check provider status'
        });
    }
});

/**
 * @route   GET /api/admin/owner
 * @desc    Get contract owner address
 * @access  Public (read-only)
 */
router.get('/owner', async (req, res) => {
    try {
        const owner = await adminService.getOwner();
        const adminAddress = adminService.getAdminAddress();
        
        res.json({
            success: true,
            contractOwner: owner,
            adminWalletAddress: adminAddress,
            isOwner: owner.toLowerCase() === adminAddress.toLowerCase()
        });
    } catch (error) {
        console.error('Error in owner endpoint:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to get owner info'
        });
    }
});

module.exports = router;
