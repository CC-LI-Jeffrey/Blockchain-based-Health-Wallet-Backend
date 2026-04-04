const test = require('node:test');
const assert = require('node:assert/strict');
const { ethers } = require('ethers');

const requiredEnv = [
  'RPC_URL',
  'PARTIAL_SHARE_EXTENSION_ADDRESS',
  'SC_TEST_OWNER_PK',
  'SC_TEST_ALICE_PK',
  'SC_TEST_BOB_PK'
];

const hasConfig = requiredEnv.every((key) => !!process.env[key]);

const partialShareAbi = [
  'function registerRecord(uint256 recordId, address owner) external',
  'function grantPartialAccess(uint256 recordId, address receiver, string shareIPFSHash, bytes32 merkleRoot, uint256 expiryTime) external',
  'function revokePartialAccess(uint256 recordId, uint256 accessIndex) external',
  'function getPartialAccess(uint256 recordId, address user) external view returns (tuple(address sharedWith, uint256 expiryTime, string shareIPFSHash, bytes32 merkleRoot, bool isActive))',
  'function hasPartialAccess(uint256 recordId, address user) external view returns (bool)',
  'function partialAccessList(uint256 recordId, uint256 index) external view returns (address sharedWith, uint256 expiryTime, string shareIPFSHash, bytes32 merkleRoot, bool isActive)'
];

async function expectRevert(txPromise, containsMessage) {
  await assert.rejects(
    txPromise,
    (err) => {
      const msg = String(err?.message || err);
      return msg.includes(containsMessage) || msg.includes('revert');
    },
    `Expected revert containing: ${containsMessage}`
  );
}

if (hasConfig) {
  test('on-chain merkle anchor and access control validation', async () => {
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);

  const owner = new ethers.Wallet(process.env.SC_TEST_OWNER_PK, provider);
  const alice = new ethers.Wallet(process.env.SC_TEST_ALICE_PK, provider);
  const bob = new ethers.Wallet(process.env.SC_TEST_BOB_PK, provider);

  const contractAddress = process.env.PARTIAL_SHARE_EXTENSION_ADDRESS;
  const contractOwner = new ethers.Contract(contractAddress, partialShareAbi, owner);
  const contractAlice = new ethers.Contract(contractAddress, partialShareAbi, alice);
  const contractBob = new ethers.Contract(contractAddress, partialShareAbi, bob);

  const recordId = BigInt(Date.now());
  const ipfsHash = 'QmMerkleAnchorTestHash';
  const merkleRoot = ethers.keccak256(ethers.toUtf8Bytes('medication-root-v1'));
  const tamperedRoot = merkleRoot.slice(0, -1) + (merkleRoot.endsWith('0') ? '1' : '0');
  const expiryTime = Math.floor(Date.now() / 1000) + 3600;

  // TC-MERK-CHAIN-01: register + grant should persist merkle root on-chain.
  await (await contractOwner.registerRecord(recordId, alice.address)).wait();
  await (await contractAlice.grantPartialAccess(recordId, bob.address, ipfsHash, merkleRoot, expiryTime)).wait();

  const stored = await contractAlice.getPartialAccess(recordId, bob.address);
  assert.equal(stored.sharedWith, bob.address, 'Receiver should match');
  assert.equal(stored.shareIPFSHash, ipfsHash, 'IPFS hash should match');
  assert.equal(stored.merkleRoot, merkleRoot, 'Stored merkle root should match anchored root');

  // TC-MERK-CHAIN-02: root integrity check (tampered root must not equal on-chain root).
  assert.notEqual(stored.merkleRoot, tamperedRoot, 'Tampered root must not match on-chain anchored root');

  // TC-MERK-CHAIN-03: unauthorized grant should revert.
  await expectRevert(
    contractBob.grantPartialAccess(recordId, owner.address, 'QmBad', merkleRoot, expiryTime),
    'Not owner'
  );

  // TC-MERK-CHAIN-04: owner revoke works, then access becomes inactive.
  await (await contractAlice.revokePartialAccess(recordId, 0)).wait();
  const hasAccess = await contractAlice.hasPartialAccess(recordId, bob.address);
  assert.equal(hasAccess, false, 'Access should be inactive after owner revocation');

  // TC-MERK-CHAIN-05: unauthorized revoke should revert.
  await expectRevert(
    contractBob.revokePartialAccess(recordId, 0),
    'Not owner'
  );
  });
} else {
  test('on-chain merkle anchor and access control validation', { skip: 'Set RPC_URL, PARTIAL_SHARE_EXTENSION_ADDRESS, SC_TEST_OWNER_PK, SC_TEST_ALICE_PK, SC_TEST_BOB_PK' }, () => {});
}
