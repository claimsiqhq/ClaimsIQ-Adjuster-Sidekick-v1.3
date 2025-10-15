// services/fnol.ts
// FNOL-specific business logic

export interface FNOLData {
  assignmentBy: string | null;
  carrierName: string | null;
  datePrepared: string | null;
  policyDetails: {
    policyNumber: string | null;
    claimNumber: string | null;
    policyPeriod: string | null;
  };
  policyHolder: {
    insuredName: string | null;
    insuredAddress: string | null;
  };
  agency: {
    agencyName: string | null;
    agencyPhone: string | null;
  };
  adjustor: {
    adjustorAssigned: string | null;
    adjustorEmail: string | null;
    adjustorPhoneNumber: string | null;
    adjustorExtension: string | null;
  };
  lossDetails: {
    claimType: string | null;
    causeOfLoss: string | null;
    dateOfLoss: string | null;
    timeOfLoss: string | null;
    lossLocation: string | null;
    lossDescription: string | null;
    descriptionOfDamage: string | null;
    estimatedLoss: string | null;
    additionalInformation: string | null;
  };
  reporterInfo: {
    reportersName: string | null;
    callerType: string | null;
    callerHomePhone: string | null;
    callerCellPhone: string | null;
    callerBusinessPhone: string | null;
    callerEmailAddress: string | null;
    callerExtension: string | null;
  };
  officialReports: {
    reportedToPolice: boolean | null;
    policeDepartment: string | null;
    policeReportNumber: string | null;
    fireDepartmentInvolved: boolean | null;
    fireDepartment: string | null;
    fireReportNumber: string | null;
  };
  additionalContacts: Array<{
    name: string | null;
    address: string | null;
    residencePhone: string | null;
    businessPhone: string | null;
    cellPhone: string | null;
    email: string | null;
    extension: string | null;
  }>;
  miscellaneous: {
    buildingInfo: string | null;
    executive: string | null;
    riskManager: string | null;
    claimsContact: string | null;
  };
}

export interface ClaimUpdate {
  claim_number?: string;
  policy_number?: string;
  carrier_name?: string;
  insured_name?: string;
  insured_phone?: string;
  insured_email?: string;
  adjuster_name?: string;
  adjuster_email?: string;
  adjuster_phone?: string;
  loss_date?: string;
  time_of_loss?: string;
  reported_date?: string;
  loss_type?: string;
  loss_location?: string;
  loss_description?: string;
  cause_of_loss?: string;
  estimated_loss?: number;
  reporter_name?: string;
  reporter_phone?: string;
  property_address?: any;
  metadata?: any;
}

/**
 * Map FNOL extracted data to claims table columns
 */
export function mapFNOLToClaim(fnolData: FNOLData): ClaimUpdate {
  const update: ClaimUpdate = {
    metadata: fnolData, // Store complete JSON
  };

  // Map individual fields for querying
  if (fnolData.policyDetails?.claimNumber) {
    update.claim_number = fnolData.policyDetails.claimNumber;
  }
  if (fnolData.policyDetails?.policyNumber) {
    update.policy_number = fnolData.policyDetails.policyNumber;
  }
  if (fnolData.carrierName) {
    update.carrier_name = fnolData.carrierName;
  }
  if (fnolData.policyHolder?.insuredName) {
    update.insured_name = fnolData.policyHolder.insuredName;
  }
  if (fnolData.adjustor?.adjustorAssigned) {
    update.adjuster_name = fnolData.adjustor.adjustorAssigned;
  }
  if (fnolData.adjustor?.adjustorEmail) {
    update.adjuster_email = fnolData.adjustor.adjustorEmail;
  }
  if (fnolData.adjustor?.adjustorPhoneNumber) {
    update.adjuster_phone = fnolData.adjustor.adjustorPhoneNumber;
  }
  if (fnolData.lossDetails?.lossLocation) {
    update.loss_location = fnolData.lossDetails.lossLocation;
  }
  if (fnolData.lossDetails?.lossDescription) {
    update.loss_description = fnolData.lossDetails.lossDescription;
  }
  if (fnolData.lossDetails?.causeOfLoss) {
    update.cause_of_loss = fnolData.lossDetails.causeOfLoss;
  }
  if (fnolData.lossDetails?.dateOfLoss) {
    update.loss_date = fnolData.lossDetails.dateOfLoss;
  }
  if (fnolData.lossDetails?.timeOfLoss) {
    update.time_of_loss = fnolData.lossDetails.timeOfLoss;
  }
  if (fnolData.lossDetails?.claimType) {
    update.loss_type = fnolData.lossDetails.claimType;
  }
  if (fnolData.lossDetails?.estimatedLoss) {
    const amount = parseFloat(fnolData.lossDetails.estimatedLoss.replace(/[^0-9.]/g, ''));
    if (!isNaN(amount)) {
      update.estimated_loss = amount;
    }
  }
  if (fnolData.reporterInfo?.reportersName) {
    update.reporter_name = fnolData.reporterInfo.reportersName;
  }
  if (fnolData.reporterInfo?.callerCellPhone || fnolData.reporterInfo?.callerHomePhone) {
    update.reporter_phone = fnolData.reporterInfo.callerCellPhone || fnolData.reporterInfo.callerHomePhone;
  }

  return update;
}

/**
 * Validate FNOL JSON structure
 */
export function validateFNOL(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['FNOL data must be an object'] };
  }

  // Check required top-level keys
  const requiredKeys = ['policyDetails', 'policyHolder', 'lossDetails', 'reporterInfo'];
  for (const key of requiredKeys) {
    if (!data[key]) {
      errors.push(`Missing required section: ${key}`);
    }
  }

  // Validate structure
  if (data.policyDetails && typeof data.policyDetails !== 'object') {
    errors.push('policyDetails must be an object');
  }
  
  if (data.additionalContacts && !Array.isArray(data.additionalContacts)) {
    errors.push('additionalContacts must be an array');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get confidence score for extracted data
 * Based on number of filled fields vs total fields
 */
export function calculateFNOLConfidence(data: FNOLData): number {
  let filled = 0;
  let total = 0;

  function countFields(obj: any, skipArrays = false): void {
    if (!obj || typeof obj !== 'object') return;
    
    for (const [key, value] of Object.entries(obj)) {
      if (Array.isArray(value)) {
        if (!skipArrays && value.length > 0) {
          value.forEach(item => countFields(item, true));
        }
      } else if (value && typeof value === 'object') {
        countFields(value);
      } else {
        total++;
        if (value !== null && value !== undefined && value !== '') {
          filled++;
        }
      }
    }
  }

  countFields(data);
  
  return total > 0 ? filled / total : 0;
}

