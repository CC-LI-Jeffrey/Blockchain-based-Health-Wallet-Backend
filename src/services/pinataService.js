const { PinataSDK } = require("pinata");

class PinataService {
  constructor() {
    if (!process.env.PINATA_JWT) {
      console.warn('PINATA_JWT not configured');
      this.pinata = null;
      return;
    }
    
    this.pinata = new PinataSDK({ pinataJwt: process.env.PINATA_JWT });
    this.testConnection();
  }
  
  async testConnection() {
    try {
      await this.pinata.testAuthentication();
      console.log('Pinata IPFS connected');
    } catch (error) {
      console.error('Pinata connection failed:', error.message);
    }
  }
  
  async uploadFile(fileBuffer, fileName, metadata = {}) {
    try {
      if (!this.pinata) {
        throw new Error('Pinata not configured');
      }
      
    const options = {
        pinataMetadata: {
          name: fileName,
          keyvalues: {
            uploadDate: new Date().toISOString(),
            ...metadata
          }
        },
        pinataOptions: {
          cidVersion: 0
        }
      };

      const blob = new Blob([fileBuffer]);
      const file = new File([blob], fileName);

      const uploadData = await this.pinata.upload.public.file(file, options);

      return {
        ipfsHash: uploadData.cid,
        pinSize: uploadData.size,
        timestamp: uploadData.created_at
      };
      
    } catch (error) {
      console.error('Pinata upload error:', error);
      throw new Error(`IPFS upload failed: ${error.message}`);
    }
  }
  
  getFileUrl(ipfsHash) {
    return `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
  }
  
  async deleteFile(ipfsHash) {
    try {
      if (!this.pinata) {
        throw new Error('Pinata not configured');
      }
      
      await this.pinata.files.public.delete([ipfsHash]);
      return true;
    } catch (error) {
      console.error('Pinata delete error:', error);
      throw new Error(`IPFS delete failed: ${error.message}`);
    }
  }
  
}

module.exports = new PinataService();