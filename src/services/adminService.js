const ethers = require('ethers');
require('dotenv').config();

/**
 * AdminService handles admin-only blockchain operations.
 * Only the contract owner (admin) can execute these functions.
 * 
 * Admin Operations:
 * - authorizeProvider: Grant PROVIDER_ROLE to healthcare providers
 * - revokeProviderAuthorization: Remove PROVIDER_ROLE from providers
 * 
 * Security: Uses admin wallet (ADMIN_PRIVATE_KEY) for signing transactions.
 */
class AdminService {
    constructor() {
        this.provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'http://127.0.0.1:8545');
        
        if (!process.env.ADMIN_PRIVATE_KEY) {
            throw new Error('ADMIN_PRIVATE_KEY not found in environment variables');
        }
        
        this.adminWallet = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY, this.provider);
        
        this.contractAddress = process.env.CONTRACT_ADDRESS;
        
        // Minimal ABI for admin functions only
        this.contractABI = [
            "function authorizeProvider(address provider) public",
            "function revokeProviderAuthorization(address provider) public",
            "function hasRole(bytes32 role, address account) public view returns (bool)",
            "function PROVIDER_ROLE() public view returns (bytes32)",
            "function owner() public view returns (address)"
        ];
        
        this.contract = new ethers.Contract(
            this.contractAddress,
            this.contractABI,
            this.adminWallet
        );
        
        console.log('AdminService initialized with admin wallet:', this.adminWallet.address);
    }
    
    /**
     * Authorize a provider to issue health records.
     * Only contract owner can call this.
     * 
     * @param {string} providerAddress - Address of the healthcare provider
     * @returns {Object} Transaction details
     */
    async authorizeProvider(providerAddress) {
        try {
            if (!ethers.isAddress(providerAddress)) {
                throw new Error('Invalid provider address');
            }
            
            console.log(`[Admin] Authorizing provider: ${providerAddress}`);
            
            const tx = await this.contract.authorizeProvider(providerAddress);
            console.log(`Transaction sent: ${tx.hash}`);
            
            const receipt = await tx.wait();
            console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
            
            return {
                success: true,
                transactionHash: receipt.hash,
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed.toString(),
                providerAddress: providerAddress
            };
        } catch (error) {
            console.error('Error authorizing provider:', error);
            throw error;
        }
    }
    
    /**
     * Revoke provider authorization.
     * Only contract owner can call this.
     * 
     * @param {string} providerAddress - Address of the provider to revoke
     * @returns {Object} Transaction details
     */
    async revokeProviderAuthorization(providerAddress) {
        try {
            if (!ethers.isAddress(providerAddress)) {
                throw new Error('Invalid provider address');
            }
            
            console.log(`[Admin] Revoking provider authorization: ${providerAddress}`);
            
            const tx = await this.contract.revokeProviderAuthorization(providerAddress);
            console.log(`Transaction sent: ${tx.hash}`);
            
            const receipt = await tx.wait();
            console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
            
            return {
                success: true,
                transactionHash: receipt.hash,
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed.toString(),
                providerAddress: providerAddress
            };
        } catch (error) {
            console.error('Error revoking provider authorization:', error);
            throw error;
        }
    }
    
    /**
     * Check if an address is an authorized provider.
     * Read-only operation.
     * 
     * @param {string} providerAddress - Address to check
     * @returns {boolean} True if authorized provider
     */
    async isAuthorizedProvider(providerAddress) {
        try {
            if (!ethers.isAddress(providerAddress)) {
                throw new Error('Invalid provider address');
            }
            
            const providerRole = await this.contract.PROVIDER_ROLE();
            const hasRole = await this.contract.hasRole(providerRole, providerAddress);
            
            return hasRole;
        } catch (error) {
            console.error('Error checking provider status:', error);
            throw error;
        }
    }
    
    /**
     * Get contract owner address.
     * Read-only operation.
     * 
     * @returns {string} Owner address
     */
    async getOwner() {
        try {
            const owner = await this.contract.owner();
            return owner;
        } catch (error) {
            console.error('Error getting owner:', error);
            throw error;
        }
    }
    
    /**
     * Get admin wallet address.
     * 
     * @returns {string} Admin wallet address
     */
    getAdminAddress() {
        return this.adminWallet.address;
    }
}

module.exports = new AdminService();
