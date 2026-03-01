pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/comparators.circom";

/*
 * AgeVerify circuit
 *
 * Private input: birthYear  — NEVER leaves the user's device
 * Public inputs: currentYear, minAge (always 18)
 * Output:        isAdult      (1 = age >= minAge, else proof fails)
 *
 * The prover knows birthYear. The verifier only learns:
 *   - currentYear (e.g. 2026)
 *   - minAge      (18)
 *   - isAdult     (1)
 * They learn NOTHING about the actual birthYear.
 */
template AgeVerify() {
    // Private input — kept secret
    signal input birthYear;

    // Public inputs — revealed to verifier
    signal input currentYear;
    signal input minAge;

    // Public output
    signal output isAdult;

    // Compute age within the circuit
    signal age;
    age <== currentYear - birthYear;

    // Constraint 1: age >= minAge  (e.g. age >= 18)
    component gte = GreaterEqThan(8);  // 8 bits supports values 0-255
    gte.in[0] <== age;
    gte.in[1] <== minAge;

    // Constraint 2: age < 150  (sanity: no one is 150+ years old)
    component lt = LessThan(8);
    lt.in[0] <== age;
    lt.in[1] <== 150;

    // Both constraints must be satisfied
    signal bothValid;
    bothValid <== gte.out * lt.out;

    // isAdult must equal 1 — proof is invalid if 0
    isAdult <== bothValid;
    isAdult === 1;
}

// Public signals: currentYear and minAge are visible to verifier
// birthYear stays private
component main { public [currentYear, minAge] } = AgeVerify();
