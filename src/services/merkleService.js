const crypto = require('crypto');

/**
 * Merkle Tree Service for Partial Data Sharing
 * Enables selective attribute disclosure with cryptographic proofs
 */

class MerkleService {
    /**
     * Build a Merkle tree from record attributes
     * @param {string} recordType - Type of record (PERSONAL_INFO, MEDICATION, etc.)
     * @param {Object} attributes - Key-value pairs of attributes
     * @returns {Object} - { root, tree, leaves }
     */
    buildMerkleTree(recordType, attributes) {
        const schema = this.getSchema(recordType);
        
        // Create leaves in schema order
        const leaves = schema.map(attrName => {
            const value = attributes[attrName] || '';
            return this.hashLeaf(attrName, value);
        });
        
        // Build tree bottom-up
        const tree = this.constructTree(leaves);
        
        return {
            root: tree[tree.length - 1][0],
            tree: tree,
            leaves: leaves,
            schema: schema
        };
    }
    
    /**
     * Hash a single leaf node
     * @param {string} attributeName - Name of the attribute
     * @param {string} attributeValue - Value of the attribute
     * @returns {string} - Hex hash
     */
    hashLeaf(attributeName, attributeValue) {
        const data = `${attributeName}:${attributeValue}`;
        return crypto.createHash('sha256').update(data).digest('hex');
    }
    
    /**
     * Construct Merkle tree from leaves
     * @param {Array<string>} leaves - Array of leaf hashes
     * @returns {Array<Array<string>>} - Tree layers
     */
    constructTree(leaves) {
        if (leaves.length === 0) {
            throw new Error('Cannot build tree from empty leaves');
        }
        
        const tree = [leaves];
        let currentLayer = leaves;
        
        while (currentLayer.length > 1) {
            const nextLayer = [];
            
            for (let i = 0; i < currentLayer.length; i += 2) {
                if (i + 1 < currentLayer.length) {
                    // Pair exists
                    const combined = currentLayer[i] + currentLayer[i + 1];
                    const hash = crypto.createHash('sha256').update(combined).digest('hex');
                    nextLayer.push(hash);
                } else {
                    // Odd node, duplicate it
                    const combined = currentLayer[i] + currentLayer[i];
                    const hash = crypto.createHash('sha256').update(combined).digest('hex');
                    nextLayer.push(hash);
                }
            }
            
            tree.push(nextLayer);
            currentLayer = nextLayer;
        }
        
        return tree;
    }
    
    /**
     * Generate Merkle proof for a specific attribute
     * @param {Object} merkleTree - Result from buildMerkleTree
     * @param {string} attributeName - Name of attribute to prove
     * @param {string} attributeValue - Value of attribute
     * @returns {Array<string>} - Array of sibling hashes (proof path)
     */
    generateProof(merkleTree, attributeName, attributeValue) {
        const { tree, schema } = merkleTree;
        
        // Find index of attribute in schema
        const leafIndex = schema.indexOf(attributeName);
        if (leafIndex === -1) {
            throw new Error(`Attribute ${attributeName} not found in schema`);
        }
        
        const proof = [];
        let currentIndex = leafIndex;
        
        // Traverse from leaf to root, collecting sibling hashes
        for (let level = 0; level < tree.length - 1; level++) {
            const layer = tree[level];
            const isRightNode = currentIndex % 2 === 1;
            
            if (isRightNode) {
                // Sibling is to the left
                proof.push({
                    hash: layer[currentIndex - 1],
                    position: 'left'
                });
            } else {
                // Sibling is to the right
                if (currentIndex + 1 < layer.length) {
                    proof.push({
                        hash: layer[currentIndex + 1],
                        position: 'right'
                    });
                } else {
                    // No sibling, duplicate self
                    proof.push({
                        hash: layer[currentIndex],
                        position: 'right'
                    });
                }
            }
            
            currentIndex = Math.floor(currentIndex / 2);
        }
        
        return proof;
    }
    
    /**
     * Verify a Merkle proof
     * @param {string} attributeName - Name of attribute
     * @param {string} attributeValue - Value of attribute
     * @param {Array<Object>} proof - Proof path from generateProof
     * @param {string} expectedRoot - Expected Merkle root
     * @returns {boolean} - True if proof is valid
     */
    verifyProof(attributeName, attributeValue, proof, expectedRoot) {
        // Start with leaf hash
        let currentHash = this.hashLeaf(attributeName, attributeValue);
        
        // Climb the tree using proof
        for (const proofNode of proof) {
            if (proofNode.position === 'left') {
                // Sibling is on left
                const combined = proofNode.hash + currentHash;
                currentHash = crypto.createHash('sha256').update(combined).digest('hex');
            } else {
                // Sibling is on right
                const combined = currentHash + proofNode.hash;
                currentHash = crypto.createHash('sha256').update(combined).digest('hex');
            }
        }
        
        return currentHash === expectedRoot;
    }
    
    /**
     * Generate proofs for multiple attributes
     * @param {Object} merkleTree - Result from buildMerkleTree
     * @param {Object} attributes - Attributes to generate proofs for
     * @returns {Object} - Map of attribute names to proofs
     */
    generateProofs(merkleTree, attributes) {
        const proofs = {};
        
        for (const [attrName, attrValue] of Object.entries(attributes)) {
            proofs[attrName] = this.generateProof(merkleTree, attrName, attrValue);
        }
        
        return proofs;
    }
    
    /**
     * Get schema for a record type
     * @param {string} recordType - Type of record
     * @returns {Array<string>} - Ordered list of attribute names
     */
    getSchema(recordType) {
        const schemas = require('../schemas/recordSchemas');
        
        const schema = schemas[recordType];
        if (!schema) {
            throw new Error(`Unknown record type: ${recordType}`);
        }
        
        return schema;
    }
}

module.exports = new MerkleService();
