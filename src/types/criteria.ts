export type InspectionType = 'DIMENSIONAL' | 'VISUAL' | 'PENETRANT';

export type DimensionalRuleType = 'RANGE' | 'MAX_ONLY' | 'MIN_ONLY';

export interface DimensionalCriterion {
  criteriaId: string;
  manualNumber: string;
  revision: string;
  effectiveDate: string;
  engineModel: string;
  partNumber: string;
  inspectionType: 'DIMENSIONAL';
  measurementPoint: string;
  nominalValue: number;
  lowerLimit: number;
  upperLimit: number;
  unit: 'mm' | 'μm';
  ruleType: DimensionalRuleType;
  expectedMin: number; // for sanity check / input error warning
  expectedMax: number;
  description: string;
  toolRequired: string;
}

export interface VisualReferenceSample {
  id: string;
  type: 'OK' | 'NG';
  title: string;
  description: string;
  defectClass?: string;
}

export interface VisualCriterion {
  criteriaId: string;
  manualNumber: string;
  revision: string;
  effectiveDate: string;
  engineModel: string;
  partNumber: string;
  inspectionType: 'VISUAL';
  inspectionArea: string;
  areaCode: string;
  criterionText: string;
  acceptanceCriteria: string;
  rejectionCriteria: string;
  approvedDefectClasses: string[];
  referenceSamples: VisualReferenceSample[];
}

export interface PenetrantCriterion {
  criteriaId: string;
  manualNumber: string;
  revision: string;
  effectiveDate: string;
  engineModel: string;
  partNumber: string;
  inspectionType: 'PENETRANT';
  criterionText: string;
  linearIndicationRule: string;
  nonLinearIndicationRule: string;
  criticalAreas: string[];
}
