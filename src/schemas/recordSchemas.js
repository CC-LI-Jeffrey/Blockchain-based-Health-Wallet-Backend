
/**
 * Record Type Schemas
 * Defines the ordered list of attributes for each record type
 * Order MUST remain consistent for Merkle tree construction
 */

module.exports = {
    PERSONAL_INFO: [
        'fullName',
        'dateOfBirth',
        'gender',
        'bloodType',
        'address',
        'phoneNumber',
        'email',
        'emergencyContact',
        'emergencyPhone',
        'allergies',
        'chronicConditions'
    ],
    
    MEDICATION: [
        'medicineName',
        'dosage',
        'prescribedBy',
        'startDate',
        'endDate',
        'frequency',
        'purpose',
        'sideEffects',
        'pharmacy',
        'prescriptionNumber',
        'refillsRemaining',
        'cost',
        'insurance',
        'notes',
        'doctorPhone'
    ],
    
    VACCINATION: [
        'vaccineName',
        'manufacturer',
        'lotNumber',
        'doseNumber',
        'totalDoses',
        'vaccinationDate',
        'administeredBy',
        'facilityName',
        'facilityAddress',
        'nextDoseDate',
        'reactions',
        'certificateNumber',
        'notes',
        'boosterRequired'
    ],
    
    MEDICAL_REPORT: [
        'reportTitle',
        'reportType',
        'reportDate',
        'facilityName',
        'doctorName',
        'doctorSpecialty',
        'chiefComplaint',
        'diagnosis',
        'treatmentPlan',
        'medications',
        'labResults',
        'imagingResults',
        'vitalSigns',
        'followUpDate',
        'referrals',
        'notes',
        'billingCode'
    ]
};
