export type JudgmentResult = 'OK' | 'NG' | 'REVIEW' | 'PENDING';

export type FinalReuseDecision = 'REUSE' | 'NG_REPLACE' | 'QC_REVIEW' | 'INCOMPLETE';

export type InspectionStep = 'INIT' | 'DIMENSIONAL' | 'VISUAL' | 'PENETRANT' | 'SUMMARY' | 'COMPLETED';

export type SyncStatus = 'SAVED_LOCALLY' | 'PENDING_SYNC' | 'SYNCING' | 'SYNCED' | 'SYNC_ERROR';

export interface MeasurementCorrection {
  timestamp: string;
  previousValue: number;
  newValue: number;
  reason?: string;
}

export interface DimensionalMeasurement {
  measurementPoint: string;
  criteriaId: string;
  actualValue: number | null;
  unit: string;
  nominalValue: number;
  lowerLimit: number;
  upperLimit: number;
  ruleType: 'RANGE' | 'MAX_ONLY' | 'MIN_ONLY';
  calculatedResult: JudgmentResult;
  deviation: number | null;
  manualRevision: string;
  measuredAt: string;
  correctionHistory: MeasurementCorrection[];
  isConfirmed: boolean;
}

export interface AIPredictionResult {
  hasDetection: boolean;
  defectClass?: string;
  confidence?: number; // Detection confidence (0-100%)
  location?: string;
  aiSuggestion?: 'OK' | 'REVIEW' | 'NG';
  modelVersion?: string;
  mode: 'DATASET_COLLECTION' | 'EXPERIMENTAL' | 'VALIDATED';
}

export interface VisualAreaInspection {
  areaCode: string;
  inspectionArea: string;
  criteriaId: string;
  manualRevision: string;
  capturedImageId?: string;
  capturedImageDataUrl?: string; // Cache data URL for quick local preview
  imageQualityScore?: number;
  imageQualityStatus?: 'OK' | 'BLURRED' | 'TOO_DARK' | 'TOO_BRIGHT' | 'LOW_RESOLUTION';
  aiPrediction?: AIPredictionResult;
  inspectorJudgment: JudgmentResult;
  inspectorDefectType?: string;
  inspectorDefectLocation?: string;
  inspectorRemarks?: string;
  inspectedAt?: string;
  isCompleted: boolean;
}

export interface PenetrantInspectionRecord {
  criteriaId: string;
  manualRevision: string;
  capturedImageId?: string;
  capturedImageDataUrl?: string;
  imageQualityScore?: number;
  imageQualityStatus?: 'OK' | 'BLURRED' | 'TOO_DARK' | 'TOO_BRIGHT' | 'LOW_RESOLUTION';
  aiPrediction?: AIPredictionResult;
  inspectorJudgment: JudgmentResult;
  inspectorRemarks?: string;
  inspectedAt?: string;
  isCompleted: boolean;
}

export interface InspectionRecord {
  inspectionId: string; // Immutable unique identifier
  joNumber: string; // Job Order Number
  engineModel: string;
  partNumber: string;
  pistonPosition: string; // e.g. "Cylinder #1"
  inspectorName: string;
  manualNumber: string;
  criteriaRevision: string;
  createdAt: string;
  updatedAt: string;
  currentStep: InspectionStep;
  currentVisualIndex: number; // 0 to 6
  
  // Inspection sections
  dimensionalMeasurements: DimensionalMeasurement[];
  visualInspections: VisualAreaInspection[];
  penetrantInspection: PenetrantInspectionRecord;
  
  // Summary & final judgment
  dimensionalResult: JudgmentResult;
  visualResult: JudgmentResult;
  penetrantResult: JudgmentResult;
  finalDecision: FinalReuseDecision;
  finalizedAt?: string;
  
  // Sync state
  syncStatus: SyncStatus;
  lastSyncedAt?: string;
  syncAttempts: number;
  syncErrorMessage?: string;

  // PDF checksheet cache
  pdfGenerated: boolean;
  pdfGeneratedAt?: string;
}
