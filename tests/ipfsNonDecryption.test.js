const test = require('node:test');
const assert = require('node:assert/strict');

const router = require('../src/routes/ipfs');
const pinataService = require('../src/services/pinataService');

function findUploadHandler() {
  const routeLayer = router.stack.find(
    (layer) => layer.route && layer.route.path === '/upload' && layer.route.methods.post
  );

  if (!routeLayer) {
    throw new Error('Could not find POST /upload route');
  }

  // Route stack is [multer middleware, async handler]. We want the final business handler.
  return routeLayer.route.stack[routeLayer.route.stack.length - 1].handle;
}

test('backend non-decryption validation: upload forwards bytes and returns CID metadata only', async () => {
  const handler = findUploadHandler();

  const encryptedPayload = Buffer.from([0xde, 0xad, 0xbe, 0xef, 0x01, 0x02, 0x03, 0x04]);

  const originalUpload = pinataService.uploadFile;
  const originalGetFileUrl = pinataService.getFileUrl;

  let captured = null;

  pinataService.uploadFile = async (buffer, name, metadata) => {
    captured = { buffer, name, metadata };
    return {
      ipfsHash: 'QmTestHash123',
      pinSize: buffer.length,
      timestamp: '2026-04-02T00:00:00.000Z'
    };
  };

  pinataService.getFileUrl = (ipfsHash) => `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;

  const req = {
    file: {
      buffer: encryptedPayload,
      originalname: 'encrypted_payload.bin',
      mimetype: 'application/octet-stream',
      size: encryptedPayload.length
    },
    body: {}
  };

  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };

  try {
    await handler(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.ipfsHash, 'QmTestHash123');
    assert.match(res.body.fileUrl, /^https:\/\/gateway\.pinata\.cloud\/ipfs\//);

    // Verify raw encrypted bytes are forwarded unchanged.
    assert.ok(captured, 'Expected uploadFile to be called');
    assert.equal(Buffer.compare(captured.buffer, encryptedPayload), 0, 'Encrypted bytes must be forwarded unchanged');

    // Verify backend handles metadata/CID response, not plaintext content.
    assert.equal(captured.metadata.encrypted, true);
    assert.equal(captured.metadata.originalName, 'encrypted_payload.bin');
    assert.equal(captured.metadata.mimeType, 'application/octet-stream');
    assert.equal(captured.metadata.size, encryptedPayload.length);

    assert.equal(typeof res.body.ipfsHash, 'string');
    assert.equal(typeof res.body.fileUrl, 'string');
    assert.equal('plaintext' in res.body, false);
    assert.equal('decryptedData' in res.body, false);
  } finally {
    pinataService.uploadFile = originalUpload;
    pinataService.getFileUrl = originalGetFileUrl;
  }
});
