import { DimensionalCriterion } from '../types/criteria';
import { JudgmentResult } from '../types/inspection';

export interface DimensionalEvaluation {
  status: 'VALID' | 'ABNORMAL_INPUT' | 'STANDARD_UNAVAILABLE';
  result: JudgmentResult;
  deviation: number | null;
  message?: string;
  isCheckInputWarning: boolean;
}

/**
 * Deterministic dimensional evaluation according to official Reman criteria.
 * Real-time calculation without operator needing to press "Calculate".
 * Includes input-error guardrails against obvious typing mistakes.
 */
export function evaluateDimensional(
  rawInput: string | number,
  criterion?: DimensionalCriterion
): DimensionalEvaluation {
  if (!criterion) {
    return {
      status: 'STANDARD_UNAVAILABLE',
      result: 'PENDING',
      deviation: null,
      message: 'STANDARD NOT AVAILABLE. Engineering confirmation required.',
      isCheckInputWarning: false,
    };
  }

  const numericVal = typeof rawInput === 'number' ? rawInput : parseFloat(rawInput.trim());

  if (isNaN(numericVal)) {
    return {
      status: 'VALID',
      result: 'PENDING',
      deviation: null,
      isCheckInputWarning: false,
    };
  }

  // Obvious typo / abnormal input check:
  // e.g. Operator accidentally enters 41.8 instead of 4.18, or negative value,
  // or value outside physical expectation bounds (expectedMin, expectedMax)
  const isPhysicallyAbnormal = 
    numericVal <= 0 ||
    numericVal < criterion.expectedMin ||
    numericVal > criterion.expectedMax ||
    Math.abs(numericVal - criterion.nominalValue) > (criterion.upperLimit - criterion.lowerLimit) * 5;

  if (isPhysicallyAbnormal) {
    return {
      status: 'ABNORMAL_INPUT',
      result: 'PENDING',
      deviation: null,
      message: 'The entered value appears unusual. Please verify the measurement.',
      isCheckInputWarning: true,
    };
  }

  // Calculate deviation from nominal or upper limit
  const roundedActual = Math.round(numericVal * 1000) / 1000;
  let result: JudgmentResult = 'OK';
  let deviation: number = 0;

  if (criterion.ruleType === 'RANGE') {
    if (roundedActual < criterion.lowerLimit) {
      result = 'NG';
      deviation = Math.round((roundedActual - criterion.lowerLimit) * 1000) / 1000;
    } else if (roundedActual > criterion.upperLimit) {
      result = 'NG';
      deviation = Math.round((roundedActual - criterion.upperLimit) * 1000) / 1000;
    } else {
      result = 'OK';
      deviation = Math.round((roundedActual - criterion.nominalValue) * 1000) / 1000;
    }
  } else if (criterion.ruleType === 'MAX_ONLY') {
    if (roundedActual > criterion.upperLimit) {
      result = 'NG';
      deviation = Math.round((roundedActual - criterion.upperLimit) * 1000) / 1000;
    } else {
      result = 'OK';
      deviation = Math.round((roundedActual - criterion.nominalValue) * 1000) / 1000;
    }
  } else if (criterion.ruleType === 'MIN_ONLY') {
    if (roundedActual < criterion.lowerLimit) {
      result = 'NG';
      deviation = Math.round((roundedActual - criterion.lowerLimit) * 1000) / 1000;
    } else {
      result = 'OK';
      deviation = Math.round((roundedActual - criterion.nominalValue) * 1000) / 1000;
    }
  }

  return {
    status: 'VALID',
    result,
    deviation,
    isCheckInputWarning: false,
    message: result === 'OK' ? 'Within Standard' : 'Out of Standard Specification',
  };
}

/**
 * Format deviation with sign e.g. +0.03 mm or -0.02 mm
 */
export function formatDeviation(deviation: number | null, unit: string = 'mm'): string {
  if (deviation === null || isNaN(deviation)) return '-';
  const sign = deviation > 0 ? '+' : '';
  return `${sign}${deviation.toFixed(3)} ${unit}`;
}
