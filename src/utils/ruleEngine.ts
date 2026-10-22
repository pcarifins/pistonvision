import { InspectionRecord, FinalReuseDecision, JudgmentResult } from '../types/inspection';

export interface FinalRuleEvaluation {
  dimensionalResult: JudgmentResult;
  visualResult: JudgmentResult;
  penetrantResult: JudgmentResult;
  finalDecision: FinalReuseDecision;
  isComplete: boolean;
  missingItems: string[];
  rejectionReasons: string[];
  reviewReasons: string[];
}

/**
 * Deterministic final rule engine.
 * AI NEVER independently decides final reuse.
 * Final judgment strictly derives from:
 * Authorized Engineering Criteria + Actual Measurements + Inspector Verification.
 */
export function evaluateInspectionCompletenessAndResult(
  inspection: InspectionRecord
): FinalRuleEvaluation {
  const missingItems: string[] = [];
  const rejectionReasons: string[] = [];
  const reviewReasons: string[] = [];

  // 1. Dimensional Evaluation
  let dimensionalResult: JudgmentResult = 'OK';
  if (inspection.dimensionalMeasurements.length === 0) {
    missingItems.push('Dimensional measurements missing');
    dimensionalResult = 'PENDING';
  } else {
    for (const m of inspection.dimensionalMeasurements) {
      if (m.actualValue === null || m.calculatedResult === 'PENDING') {
        missingItems.push(`Incomplete measurement: ${m.measurementPoint}`);
        dimensionalResult = 'PENDING';
      } else if (m.calculatedResult === 'NG') {
        dimensionalResult = 'NG';
        rejectionReasons.push(`Dimensional failure on ${m.measurementPoint}: Actual ${m.actualValue} ${m.unit} (Limit: ${m.lowerLimit}-${m.upperLimit} ${m.unit})`);
      }
    }
  }

  // 2. Visual Evaluation
  let visualResult: JudgmentResult = 'OK';
  if (inspection.visualInspections.length === 0) {
    missingItems.push('Visual inspection areas missing');
    visualResult = 'PENDING';
  } else {
    for (const v of inspection.visualInspections) {
      if (!v.isCompleted || v.inspectorJudgment === 'PENDING') {
        missingItems.push(`Visual area not inspected: ${v.inspectionArea}`);
        if (visualResult !== 'NG') visualResult = 'PENDING';
      } else if (v.inspectorJudgment === 'NG') {
        visualResult = 'NG';
        rejectionReasons.push(`Visual defect on ${v.inspectionArea}: ${v.inspectorDefectType || 'Defect'} (${v.inspectorDefectLocation || 'Location unspecified'})`);
      } else if (v.inspectorJudgment === 'REVIEW') {
        if (visualResult !== 'NG') visualResult = 'REVIEW';
        reviewReasons.push(`Visual flagged for review on ${v.inspectionArea}: ${v.inspectorRemarks || 'Requires QC review'}`);
      }
    }
  }

  // 3. Penetrant Evaluation
  let penetrantResult: JudgmentResult = 'OK';
  const pt = inspection.penetrantInspection;
  if (!pt || !pt.isCompleted || pt.inspectorJudgment === 'PENDING') {
    missingItems.push('Dye penetrant inspection not completed');
    penetrantResult = 'PENDING';
  } else if (pt.inspectorJudgment === 'NG') {
    penetrantResult = 'NG';
    rejectionReasons.push(`Penetrant inspection confirmed NG: ${pt.inspectorRemarks || 'Crack/linear indication observed'}`);
  } else if (pt.inspectorJudgment === 'REVIEW') {
    penetrantResult = 'REVIEW';
    reviewReasons.push(`Penetrant inspection flagged for review: ${pt.inspectorRemarks || 'Ambiguous bleed-out'}`);
  }

  // 4. Overall Completeness Check
  const isComplete = missingItems.length === 0;

  // 5. Final Decision Calculation
  let finalDecision: FinalReuseDecision = 'INCOMPLETE';

  if (!isComplete) {
    finalDecision = 'INCOMPLETE';
  } else if (dimensionalResult === 'NG' || visualResult === 'NG' || penetrantResult === 'NG') {
    finalDecision = 'NG_REPLACE';
  } else if (visualResult === 'REVIEW' || penetrantResult === 'REVIEW') {
    finalDecision = 'QC_REVIEW';
  } else if (dimensionalResult === 'OK' && visualResult === 'OK' && penetrantResult === 'OK') {
    finalDecision = 'REUSE';
  }

  return {
    dimensionalResult,
    visualResult,
    penetrantResult,
    finalDecision,
    isComplete,
    missingItems,
    rejectionReasons,
    reviewReasons,
  };
}
