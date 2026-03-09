pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/comparators.circom";

/*
 * AgeVerify circuit — full date-aware (year + month + day)
 *
 * Private inputs:  birthYear, birthMonth, birthDay  — NEVER leave the device
 * Public inputs:   currentYear, currentMonth, currentDay, minAge
 * Output:          isAdult (1 = turned minAge on or before currentDate, else proof fails)
 *
 * Algorithm:
 *   yearDiff = currentYear - birthYear
 *   if yearDiff > minAge  → adult (birthday already passed in a prior year)
 *   if yearDiff == minAge → adult only if (currentMonth > birthMonth)
 *                           OR  (currentMonth == birthMonth AND currentDay >= birthDay)
 *   if yearDiff < minAge  → not adult
 *
 * The verifier learns: currentYear, currentMonth, currentDay, minAge, isAdult=1
 * The verifier learns NOTHING about birthYear, birthMonth, or birthDay.
 */
template AgeVerify() {
    // ── Private inputs (secret)
    signal input birthYear;
    signal input birthMonth;
    signal input birthDay;

    // ── Public inputs (revealed to verifier)
    signal input currentYear;
    signal input currentMonth;
    signal input currentDay;
    signal input minAge;

    // ── Public output
    signal output isAdult;

    // ── Step 1: year difference ──────────────────────────────────────
    signal yearDiff;
    yearDiff <== currentYear - birthYear;

    // yearDiff > minAge  (strictly over — birthday was in a previous year)
    component gtAge = GreaterThan(8);   // 8 bits covers 0-255
    gtAge.in[0] <== yearDiff;
    gtAge.in[1] <== minAge;

    // yearDiff >= minAge
    component gteAge = GreaterEqThan(8);
    gteAge.in[0] <== yearDiff;
    gteAge.in[1] <== minAge;

    // yearDiff == minAge  ⟺  (>= AND NOT >)
    signal exactAge;
    exactAge <== gteAge.out * (1 - gtAge.out);

    // ── Step 2: has birthday been reached this year? ─────────────────

    // currentMonth > birthMonth
    component monthGt = GreaterThan(4);   // 4 bits covers 1-12
    monthGt.in[0] <== currentMonth;
    monthGt.in[1] <== birthMonth;

    // currentMonth == birthMonth
    component monthEq = IsEqual();
    monthEq.in[0] <== currentMonth;
    monthEq.in[1] <== birthMonth;

    // currentDay >= birthDay
    component dayGte = GreaterEqThan(5);  // 5 bits covers 1-31
    dayGte.in[0] <== currentDay;
    dayGte.in[1] <== birthDay;

    // same month AND day has passed
    signal sameMonthDayPassed;
    sameMonthDayPassed <== monthEq.out * dayGte.out;

    // birthdayReached = monthGt OR sameMonthDayPassed
    // Boolean OR without conditionals: a + b - a*b
    signal birthdayReached;
    birthdayReached <== monthGt.out + sameMonthDayPassed - monthGt.out * sameMonthDayPassed;

    // ── Step 3: combine into isAdult ─────────────────────────────────

    // adult if (yearDiff > minAge) OR (yearDiff == minAge AND birthdayReached)
    signal exactAndBirthday;
    exactAndBirthday <== exactAge * birthdayReached;

    signal isAdultVal;
    isAdultVal <== gtAge.out + exactAndBirthday - gtAge.out * exactAndBirthday;

    // Sanity: yearDiff < 150  (no one is 150+ years old)
    component ltMax = LessThan(8);
    ltMax.in[0] <== yearDiff;
    ltMax.in[1] <== 150;

    signal bothValid;
    bothValid <== isAdultVal * ltMax.out;

    isAdult <== bothValid;
    isAdult === 1;
}

// Public signals order in proof: [isAdult, currentYear, currentMonth, currentDay, minAge]
// birthYear, birthMonth, birthDay stay private
component main { public [currentYear, currentMonth, currentDay, minAge] } = AgeVerify();
