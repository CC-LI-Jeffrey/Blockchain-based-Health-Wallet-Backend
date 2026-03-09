pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/comparators.circom";

/*
 * VaccineVerify circuit — Poseidon commitment scheme
 *
 * Proves: "I hold a vaccination record for vaccine X"
 * WITHOUT revealing: vaccinationId, salt, or any other record data
 *
 * Private inputs:  vaccinationId  — blockchain ID of the vaccination record
 *                  vaccineName    — integer code for the vaccine (e.g. 1=COVID-19)
 *                  salt           — random nonce kept only on device
 *
 * Public inputs:   commitment     — poseidon(vaccinationId, vaccineName, salt)
 *                                   registered on-chain at record creation time
 *                  targetVaccine  — the vaccine being proved (must match vaccineName)
 *
 * Output:          isVaccinated   — constrained to 1 (proof fails if 0)
 *
 * Vaccine integer codes (must match VACCINE_CODES in Kotlin / JS):
 *   1 = COVID-19
 *   2 = Influenza
 *   3 = Hepatitis B
 *   4 = Hepatitis A
 *   5 = MMR (Measles, Mumps, Rubella)
 *   6 = Varicella (Chickenpox)
 *   7 = HPV
 *   8 = Tetanus / TdaP
 *   9 = Pneumococcal
 *  10 = Meningococcal
 *  11 = Rabies
 *  12 = Yellow Fever
 *  13 = Typhoid
 *  14 = Other
 *
 * Privacy guarantee:
 *   Verifier learns: commitment (already public), targetVaccine (stated claim), isVaccinated=1
 *   Verifier learns NOTHING about vaccinationId or salt.
 *   vaccineName is private but targetVaccine is public — however, the verifier
 *   already knows which vaccine they're asking about (that's the point of the proof).
 */
template VaccineVerify() {
    // ── Private inputs (never leave the device)
    signal input vaccinationId;
    signal input vaccineName;   // Integer vaccine code
    signal input salt;          // Random nonce

    // ── Public inputs (known to verifier)
    signal input commitment;    // poseidon(vaccinationId, vaccineName, salt) — on-chain
    signal input targetVaccine; // Which vaccine to prove (e.g. 1 for COVID-19)

    // ── Public output
    signal output isVaccinated;

    // ── Step 1: Verify commitment = poseidon(vaccinationId, vaccineName, salt) ──
    component hasher = Poseidon(3);
    hasher.inputs[0] <== vaccinationId;
    hasher.inputs[1] <== vaccineName;
    hasher.inputs[2] <== salt;

    // The computed hash must equal the on-chain commitment
    commitment === hasher.out;

    // ── Step 2: Verify the vaccine name matches the target ──────────────────
    component vaccineEq = IsEqual();
    vaccineEq.in[0] <== vaccineName;
    vaccineEq.in[1] <== targetVaccine;

    // vaccineEq.out == 1 means they match
    signal vaccineMatches;
    vaccineMatches <== vaccineEq.out;

    // ── Step 3: Verify targetVaccine is in valid range (1-14) ───────────────
    component gtZero = GreaterThan(5);   // 5 bits covers 0-31
    gtZero.in[0] <== targetVaccine;
    gtZero.in[1] <== 0;

    component ltMax = LessThan(5);
    ltMax.in[0] <== targetVaccine;
    ltMax.in[1] <== 15;  // max vaccine code is 14

    signal validRange;
    validRange <== gtZero.out * ltMax.out;

    // ── Step 4: isVaccinated = vaccineMatches AND validRange ────────────────
    signal isVaccinatedVal;
    isVaccinatedVal <== vaccineMatches * validRange;

    isVaccinated <== isVaccinatedVal;
    isVaccinated === 1;
}

component main {public [commitment, targetVaccine]} = VaccineVerify();
