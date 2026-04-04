require('dotenv').config();

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { performance } = require('node:perf_hooks');

const axios = require('axios');

const merkleService = require('../src/services/merkleService');
const pinataService = require('../src/services/pinataService');

class AppPerformanceEvaluator {
  constructor(options = {}) {
    this.options = {
      partialShareRounds: options.partialShareRounds || 20,
      zkpRounds: options.zkpRounds || 3,
      ipfsRounds: options.ipfsRounds || 3,
      ipfsPayloadKb: options.ipfsPayloadKb || 64
    };
  }

  static percentile(sorted, p) {
    if (sorted.length === 0) return 0;
    const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
    return sorted[idx];
  }

  static summarize(samples) {
    const sorted = [...samples].sort((a, b) => a - b);
    const sum = sorted.reduce((acc, v) => acc + v, 0);
    return {
      count: sorted.length,
      minMs: Number((sorted[0] || 0).toFixed(2)),
      avgMs: Number((sum / Math.max(sorted.length, 1)).toFixed(2)),
      p95Ms: Number(AppPerformanceEvaluator.percentile(sorted, 95).toFixed(2)),
      maxMs: Number((sorted[sorted.length - 1] || 0).toFixed(2))
    };
  }

  static printMetric(title, metric) {
    console.log(`\n[${title}]`);
    console.log(`count=${metric.count}, min=${metric.minMs}ms, avg=${metric.avgMs}ms, p95=${metric.p95Ms}ms, max=${metric.maxMs}ms`);
  }

  async benchmarkPartialShareGenerateVerify() {
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

    const generateMs = [];
    const verifyMs = [];

    for (let i = 0; i < this.options.partialShareRounds; i++) {
      const t0 = performance.now();
      const tree = merkleService.buildMerkleTree(recordType, fullRecord);
      const proofs = merkleService.generateProofs(tree, selectedAttributes);
      const t1 = performance.now();

      for (const [attr, value] of Object.entries(selectedAttributes)) {
        const ok = merkleService.verifyProof(attr, value, proofs[attr], tree.root);
        assert.equal(ok, true, `Expected valid proof for ${attr}`);
      }
      const t2 = performance.now();

      generateMs.push(t1 - t0);
      verifyMs.push(t2 - t1);
    }

    return {
      generate: AppPerformanceEvaluator.summarize(generateMs),
      verify: AppPerformanceEvaluator.summarize(verifyMs)
    };
  }

  async benchmarkAgeZkpGenerateVerify() {
    let snarkjs;
    try {
      // Keep ZKP benchmark optional in environments where snarkjs is not installed.
      snarkjs = require('snarkjs');
    } catch (err) {
      return { skipped: true, reason: 'snarkjs module not available in current environment' };
    }

    const wasmPath = path.join(__dirname, '..', 'circuits', 'AgeVerify_js', 'AgeVerify.wasm');
    const zkeyPath = path.join(__dirname, '..', 'circuits', 'AgeVerify_final.zkey');
    const vkeyPath = path.join(__dirname, '..', 'circuits', 'verification_key.json');

    if (!fs.existsSync(wasmPath) || !fs.existsSync(zkeyPath) || !fs.existsSync(vkeyPath)) {
      return { skipped: true, reason: 'Missing AgeVerify wasm/zkey/verification key files' };
    }

    const verificationKey = JSON.parse(fs.readFileSync(vkeyPath, 'utf8'));

    const proveMs = [];
    const verifyMs = [];

    for (let i = 0; i < this.options.zkpRounds; i++) {
      const input = {
        birthYear: 1990,
        birthMonth: 6,
        birthDay: 15,
        currentYear: 2026,
        currentMonth: 4,
        currentDay: 4,
        minAge: 18
      };

      const t0 = performance.now();
      const { proof, publicSignals } = await snarkjs.groth16.fullProve(input, wasmPath, zkeyPath);
      const t1 = performance.now();

      const ok = await snarkjs.groth16.verify(verificationKey, publicSignals, proof);
      const t2 = performance.now();

      assert.equal(ok, true, 'Expected Age ZKP verification to pass');

      proveMs.push(t1 - t0);
      verifyMs.push(t2 - t1);
    }

    return {
      prove: AppPerformanceEvaluator.summarize(proveMs),
      verify: AppPerformanceEvaluator.summarize(verifyMs)
    };
  }

  async benchmarkIpfsUploadRetrieve() {
    if (!process.env.PINATA_JWT) {
      return { skipped: true, reason: 'PINATA_JWT not configured' };
    }

    const uploadMs = [];
    const retrieveMs = [];

    const payloadBytes = this.options.ipfsPayloadKb * 1024;

    for (let i = 0; i < this.options.ipfsRounds; i++) {
      const fileName = `perf-${Date.now()}-${i}.bin`;
      const payload = Buffer.alloc(payloadBytes, i + 1);

      const t0 = performance.now();
      const uploaded = await pinataService.uploadFile(payload, fileName, {
        type: 'perf-eval',
        index: i,
        bytes: payloadBytes,
        encrypted: true,
        uploadedAt: new Date().toISOString()
      });
      const t1 = performance.now();

      const fileUrl = pinataService.getFileUrl(uploaded.ipfsHash);
      const response = await axios.get(fileUrl, {
        responseType: 'arraybuffer',
        timeout: 60000
      });
      const t2 = performance.now();

      assert.equal(response.status, 200, 'Expected IPFS retrieve HTTP 200');
      assert.equal(response.data.byteLength, payload.length, 'Retrieved payload size should match uploaded size');

      uploadMs.push(t1 - t0);
      retrieveMs.push(t2 - t1);
    }

    return {
      upload: AppPerformanceEvaluator.summarize(uploadMs),
      retrieve: AppPerformanceEvaluator.summarize(retrieveMs)
    };
  }
}

test('Evaluation KPI: partial share generate/verify speed', async () => {
  const evaluator = new AppPerformanceEvaluator();
  const result = await evaluator.benchmarkPartialShareGenerateVerify();

  AppPerformanceEvaluator.printMetric('Partial Share Generate', result.generate);
  AppPerformanceEvaluator.printMetric('Partial Share Verify', result.verify);

  assert.ok(result.generate.avgMs >= 0);
  assert.ok(result.verify.avgMs >= 0);
});

test('Evaluation KPI: age ZKP generate/verify speed', async () => {
  const evaluator = new AppPerformanceEvaluator();
  const result = await evaluator.benchmarkAgeZkpGenerateVerify();

  if (result.skipped) {
    console.log(`\n[Age ZKP Benchmark] SKIPPED: ${result.reason}`);
    return;
  }

  AppPerformanceEvaluator.printMetric('Age ZKP Prove', result.prove);
  AppPerformanceEvaluator.printMetric('Age ZKP Verify', result.verify);

  assert.ok(result.prove.avgMs > 0);
  assert.ok(result.verify.avgMs >= 0);
});

test('Evaluation KPI: normal file upload/retrieve speed', async () => {
  const evaluator = new AppPerformanceEvaluator();
  const result = await evaluator.benchmarkIpfsUploadRetrieve();

  if (result.skipped) {
    console.log(`\n[IPFS Upload/Retrieve Benchmark] SKIPPED: ${result.reason}`);
    return;
  }

  AppPerformanceEvaluator.printMetric('IPFS Upload', result.upload);
  AppPerformanceEvaluator.printMetric('IPFS Retrieve', result.retrieve);

  assert.ok(result.upload.avgMs > 0);
  assert.ok(result.retrieve.avgMs > 0);
});
