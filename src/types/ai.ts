export type AIModelStatus = 'NO_MODEL' | 'EXPERIMENTAL' | 'VALIDATED' | 'RETIRED';

export interface AIModelProfile {
  modelId: string;
  modelName: string;
  modelVersion: string;
  status: AIModelStatus;
  datasetVersion: string;
  trainingDate?: string;
  validationDate?: string;
  precision?: number; // e.g. 96.4%
  recall?: number; // e.g. 98.1%
  criticalNgRecall?: number; // e.g. 99.8% (very critical for cracks/rim failure)
  falseAcceptanceRate?: number; // e.g. 0.2%
  approvalStatus: 'PENDING_APPROVAL' | 'FIELD_APPROVED' | 'DATASET_ONLY' | 'RETIRED';
  approvedBy?: string;
}

export type DefectClass = 
  | 'Pitting'
  | 'Pockmark'
  | 'Chipping'
  | 'Dent'
  | 'Scratch'
  | 'Unequal Wear'
  | 'Local Wear'
  | 'Oil Caulking'
  | 'Crack Indication'
  | 'Other / Unknown';

export interface DatasetItem {
  imageId: string;
  inspectionId: string;
  joNumber: string;
  engineModel: string;
  partNumber: string;
  pistonPosition: string;
  inspectionType: 'VISUAL' | 'PENETRANT';
  inspectionArea: string;
  imageTimestamp: string;
  inspectorJudgment: 'OK' | 'NG' | 'REVIEW';
  defectClass?: DefectClass;
  verificationStatus: 'VERIFIED' | 'UNVERIFIED' | 'FLAGGED';
  aiPredictionDefect?: string;
  aiPredictionConfidence?: number;
  aiModelVersion?: string;
  manualRevision: string;
  imageDataUrl?: string;
}

export interface AreaDatasetStats {
  area: string;
  totalImages: number;
  verifiedCount: number;
  okCount: number;
  ngCount: number;
  reviewCount: number;
  defectCounts: Record<string, number>;
  readinessStatus: 'INSUFFICIENT' | 'PARTIAL' | 'READY_FOR_TRAINING';
}

export interface AIReadinessReport {
  totalDatasetImages: number;
  totalVerified: number;
  overallOkCount: number;
  overallNgCount: number;
  areaBreakdown: AreaDatasetStats[];
  defectDistribution: Record<string, number>;
  suggestions: string[];
  activeModel: AIModelProfile;
}
