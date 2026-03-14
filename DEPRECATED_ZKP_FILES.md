# Deprecated ZKP Files - To Be Removed

These files are deprecated and should be deleted as they are no longer needed with Option A (local-first vaccine proofs):

## Files to Delete

### 1. **VaccineVerifier.sol**
- **Purpose**: Auto-generated Groth16 verifier contract for vaccine ZK proofs
- **Status**: DEPRECATED
- **Reason**: Option A uses local proof verification (database) instead of on-chain verification
- **Replacement**: Vaccine commitment tracking now in HealthWalletV2.05.sol

### 2. **VaccineVerifyExtension.sol**
- **Purpose**: Contract wrapper for submitting vaccine ZK proofs on-chain
- **Main Functions**: 
  - `submitVaccineProof(a, b, c, input)` — submit ZK proof on-chain
  - `checkVaccineProof(user, vaccineCode)` — query proof status
- **Status**: DEPRECATED
- **Reason**: With Option A, proofs are stored locally (mobile database), optional blockchain anchoring via HealthWalletV2.05
- **Replacement**: Use `HealthWalletV2_05.registerVaccineCommitment()` and `submitVaccineProof()` instead

### 3. **AgeVerifier.sol**
- **Purpose**: Auto-generated Groth16 verifier contract for age ZK proofs
- **Status**: DEPRECATED (if not actively used in AgeVerifyActivity)
- **Reason**: Age verification likely uses local proof verification (if implemented similarly to vaccine)
- **Replacement**: Use local verification in AgeVerifyActivity

### 4. **AgeVerifyExtension.sol**
- **Purpose**: Contract wrapper for submitting age ZK proofs on-chain
- **Main Functions**:
  - `submitAgeProof(a, b, c, input)` — submit ZK proof on-chain
  - `checkAgeProof(user)` — query proof status
- **Status**: DEPRECATED
- **Reason**: If AgeVerifyActivity uses Option A pattern, proofs should be stored locally
- **Replacement**: Similar local storage pattern as vaccine proofs

## Why These Are Deprecated

### Old ZKP Approach (Deprecated)
```
User generates proof locally
    ↓
Submit proof to blockchain (VaccineVerifyExtension.submitVaccineProof)
    ↓
On-chain verifier (VaccineVerifier) validates proof
    ↓
User's proof recorded on-chain
```

**Problems**:
- Expensive gas costs for on-chain verification
- High latency (1-2 min transaction confirmation)
- All proofs stored on-chain (privacy leak)
- Users must submit to blockchain to "prove" vaccination

### New Option A Approach (Active)
```
User generates proof locally
    ↓
Save proof to LOCAL DATABASE (primary - instant)
    ↓
Optional: Register commitment on blockchain (HealthWalletV2_05.registerVaccineCommitment)
    ↓
Optional: Submit proof hash on-chain (HealthWalletV2_05.submitVaccineProof)
    ↓
User's proof available locally for sharing + optional blockchain anchor
```

**Benefits**:
- Instant proof verification (no blockchain delays)
- Peer-to-peer sharing via QR code
- Privacy: Only commitment hash on-chain (if chosen)
- Users have full control over proof lifecycle
- No expensive verification transactions

## New Contract Functions (HealthWalletV2.05)

These functions replace the old VaccineVerifyExtension and AgeVerifyExtension:

```solidity
// Vaccine Commitment Tracking (Option A)
HealthWalletV2_05.registerVaccineCommitment(vaccineCode, commitment)
HealthWalletV2_05.submitVaccineProof(vaccineCode, proofHash)
HealthWalletV2_05.getVaccineCommitment(user, vaccineCode)
HealthWalletV2_05.checkVaccinationStatus(user, vaccineCode)
HealthWalletV2_05.getUserVaccineCodes(user)
HealthWalletV2_05.revokeVaccineCommitment(vaccineCode)
```

## Migration Steps

1. ✅ **Add new vaccine commitment tracking** → Done (HealthWalletV2.05.sol)
2. ✅ **Update Android app to use local database** → Done (VaccineProofRepository, VaccinePassportActivity)
3. ⏳ **Remove deprecated contract files** → This step

## Files to Keep

- ✅ **HealthWalletV2.05.sol** — Active (contains vaccine commitment tracking)
- ✅ **PartialShareExtension.sol** — Keep (data sharing functionality)
- ✅ **Circuits/** — Keep if used for local proof generation
- ✅ **AgeVerifyActivity.kt** — Keep if actively used (but review for Option A pattern)

## Action Required

Delete these files from the smart contracts directory:
```
contracts/VaccineVerifier.sol
contracts/VaccineVerifyExtension.sol
contracts/AgeVerifier.sol          (if not actively used)
contracts/AgeVerifyExtension.sol   (if not actively used)
```

**Manual deletion required** — Use IDE or file system to delete these files.
