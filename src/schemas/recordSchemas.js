
/**
 * Record Type Schemas
 * Defines the ordered list of attributes for each record type
 * Order MUST remain consistent for Merkle tree construction
 */

module.exports = {
    PERSONAL_INFO: [
        'firstName',
        'lastName',
        'email',
        'hkid',
        'dateOfBirth',
        'gender',
        'bloodType',
        'phone',
        'address',
        'emergencyContactName',
        'emergencyContactRelationship',
        'emergencyContactPhone'
    ],
    
    MEDICATION: [
        'medicineName',
        'dosage',
        'frequency',
        'route',
        'startDate',
        'endDate',
        'purpose',
        'prescribedBy',
        'pharmacy',
        'notes'
    ],
    
    VACCINATION: [
        'date',
        'vaccineName',
        'vaccineNameEn',
        'vaccineFullName',
        'manufacturer',
        'country',
        'provider',
        'location',
        'batchNumber'
    ],
    
    MEDICAL_REPORT: [
        'title',
        'reportType',
        'reportTypeDisplay',
        'date',
        'doctorName',
        'hospital',
        'description'
    ]
};
