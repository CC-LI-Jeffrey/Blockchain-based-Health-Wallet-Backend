const test = require('node:test');
const assert = require('node:assert/strict');

const merkleService = require('../src/services/merkleService');

const recordType = 'MEDICATION';
const fullRecord = {
  medicineName: 'Aspirin',
  dosage: '100mg',
  frequency: 'Once daily',
  route: 'Oral',
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  purpose: 'Pain relief',
  prescribedBy: 'Dr. Smith',
  pharmacy: 'Local Pharmacy',
  notes: 'After meal'
};

const selectedAttributes = {
  medicineName: fullRecord.medicineName,
  dosage: fullRecord.dosage,
  frequency: fullRecord.frequency
};

test('valid proof verification', () => {
  const tree = merkleService.buildMerkleTree(recordType, fullRecord);
  const proofs = merkleService.generateProofs(tree, selectedAttributes);

  for (const [attr, value] of Object.entries(selectedAttributes)) {
    const ok = merkleService.verifyProof(attr, value, proofs[attr], tree.root);
    assert.equal(ok, true, `Expected valid proof for ${attr}`);
  }
});

test('tampered merkle root detection', () => {
  const tree = merkleService.buildMerkleTree(recordType, fullRecord);
  const proofs = merkleService.generateProofs(tree, selectedAttributes);

  const tamperedRoot = tree.root.slice(0, -1) + (tree.root.endsWith('0') ? '1' : '0');
  const ok = merkleService.verifyProof('dosage', selectedAttributes.dosage, proofs.dosage, tamperedRoot);

  assert.equal(ok, false, 'Expected verification failure with tampered root');
});

test('invalid proof rejection (wrong attribute/value pairing)', () => {
  const tree = merkleService.buildMerkleTree(recordType, fullRecord);
  const proofs = merkleService.generateProofs(tree, selectedAttributes);

  const ok = merkleService.verifyProof('dosage', selectedAttributes.dosage, proofs.frequency, tree.root);
  assert.equal(ok, false, 'Expected verification failure with mismatched proof path');
});

test('proof tampering attempts are rejected', () => {
  const tree = merkleService.buildMerkleTree(recordType, fullRecord);
  const proofs = merkleService.generateProofs(tree, selectedAttributes);

  const tamperedProof = JSON.parse(JSON.stringify(proofs.medicineName));
  tamperedProof[0].hash = tamperedProof[0].hash.slice(0, -1) + (tamperedProof[0].hash.endsWith('0') ? '1' : '0');

  const ok = merkleService.verifyProof('medicineName', selectedAttributes.medicineName, tamperedProof, tree.root);
  assert.equal(ok, false, 'Expected verification failure with tampered sibling hash');
});
