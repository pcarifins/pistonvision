import React, { useState, useEffect } from 'react';
import { Check, X, AlertTriangle, ArrowRight, RotateCcw, AlertCircle, ShieldAlert } from 'lucide-react';
import { InspectionRecord, DimensionalMeasurement } from '../../types/inspection';
import { evaluateDimensional, formatDeviation } from '../../utils/dimensional';
import { DIMENSIONAL_CRITERIA_MASTER } from '../../data/criteriaMaster';

interface DimensionalStepProps {
  inspection: InspectionRecord;
  onUpdateInspection: (updated: InspectionRecord) => void;
  onNext: () => void;
}

export const DimensionalStep: React.FC<DimensionalStepProps> = ({
  inspection,
  onUpdateInspection,
  onNext,
}) => {
  const measurements = inspection.dimensionalMeasurements;
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentItem: DimensionalMeasurement | undefined = measurements[currentIndex];
  const criterion = DIMENSIONAL_CRITERIA_MASTER.find((c) => c.criteriaId === currentItem?.criteriaId);

  const [inputValue, setInputValue] = useState<string>(
    currentItem?.actualValue !== null && currentItem?.actualValue !== undefined
      ? currentItem.actualValue.toString()
      : ''
  );

  // Sync input value whenever switching between measurement points
  useEffect(() => {
    if (currentItem) {
      setInputValue(
        currentItem.actualValue !== null && currentItem.actualValue !== undefined
          ? currentItem.actualValue.toString()
          : ''
      );
    }
  }, [currentIndex, currentItem]);

  // Real-time evaluation
  const evaluation = evaluateDimensional(inputValue, criterion);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);

    // As soon as valid numeric value is typed, automatically evaluate without pressing Calculate
    const parsed = parseFloat(val.trim());
    if (!isNaN(parsed) && !evaluation.isCheckInputWarning) {
      updateMeasurement(parsed, evaluation.result, evaluation.deviation);
    }
  };

  const updateMeasurement = (val: number | null, res: import('../../types/inspection').JudgmentResult, dev: number | null) => {
    if (!currentItem) return;

    const previousVal = currentItem.actualValue;
    const history = [...currentItem.correctionHistory];

    if (previousVal !== null && previousVal !== val && val !== null) {
      history.push({
        timestamp: new Date().toISOString(),
        previousValue: previousVal,
        newValue: val,
      });
    }

    const updatedList = measurements.map((m, idx) => {
      if (idx === currentIndex) {
        return {
          ...m,
          actualValue: val,
          calculatedResult: res,
          deviation: dev,
          measuredAt: new Date().toISOString(),
          correctionHistory: history,
          isConfirmed: res === 'OK',
        };
      }
      return m;
    });

    // Check if any measurement is NG
    const anyNg = updatedList.some((m) => m.calculatedResult === 'NG');
    const allDone = updatedList.every((m) => m.actualValue !== null && m.calculatedResult !== 'PENDING');

    onUpdateInspection({
      ...inspection,
      dimensionalMeasurements: updatedList,
      dimensionalResult: anyNg ? 'NG' : allDone ? 'OK' : 'PENDING',
    });
  };

  const handleConfirmNg = () => {
    if (!currentItem || inputValue === '') return;
    const val = parseFloat(inputValue);
    const updatedList = measurements.map((m, idx) => {
      if (idx === currentIndex) {
        return {
          ...m,
          actualValue: val,
          calculatedResult: 'NG' as const,
          deviation: evaluation.deviation,
          isConfirmed: true,
          measuredAt: new Date().toISOString(),
        };
      }
      return m;
    });

    onUpdateInspection({
      ...inspection,
      dimensionalMeasurements: updatedList,
      dimensionalResult: 'NG',
    });

    // Move to next measurement or summary gate
    if (currentIndex < measurements.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleReEnter = () => {
    setInputValue('');
  };

  const handleSaveAndNext = () => {
    if (currentIndex < measurements.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Completed all dimensional points
      onNext();
    }
  };

  // Dimensional Gate check
  const isAllMeasurementsRecorded = measurements.every(
    (m) => m.actualValue !== null && m.calculatedResult !== 'PENDING'
  );
  const hasConfirmedNg = measurements.some((m) => m.calculatedResult === 'NG');

  if (!currentItem) {
    return (
      <div className="p-6 text-center text-slate-700">
        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-2" />
        <p className="font-bold">No Dimensional Criteria Found for {inspection.engineModel}</p>
        <p className="text-xs text-slate-500 mt-1">STANDARD NOT AVAILABLE. Engineering confirmation required.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col gap-4 pb-20">
      {/* Progress Pills */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
          MEASUREMENT {currentIndex + 1} OF {measurements.length}
        </span>
        <div className="flex gap-1.5">
          {measurements.map((m, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`h-2 rounded-full transition-all ${
                idx === currentIndex
                  ? 'w-6 bg-blue-600'
                  : m.calculatedResult === 'OK'
                  ? 'w-2 bg-emerald-500'
                  : m.calculatedResult === 'NG'
                  ? 'w-2 bg-red-500'
                  : 'w-2 bg-slate-300'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Main Measurement Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4">
        {/* Point Title */}
        <div>
          <h2 className="text-lg font-bold text-slate-900 leading-tight">
            {currentItem.measurementPoint}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {criterion?.toolRequired || 'Vernier / Precision Micrometer'}
          </p>
        </div>

        {/* Standard Limits Box */}
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block font-mono">
              STANDARD SPECIFICATION
            </span>
            <span className="text-base font-bold text-slate-800 font-mono">
              {currentItem.lowerLimit.toFixed(2)} – {currentItem.upperLimit.toFixed(2)} {currentItem.unit}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase text-slate-400 block font-mono">Nominal</span>
            <span className="text-xs font-semibold text-slate-600 font-mono">
              {currentItem.nominalValue.toFixed(2)} {currentItem.unit}
            </span>
          </div>
        </div>

        {/* Actual Input */}
        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wide">
            ACTUAL MEASUREMENT
          </label>
          <div className="relative">
            <input
              type="text"
              inputMode="decimal"
              value={inputValue}
              onChange={handleInputChange}
              placeholder="e.g. 4.18"
              autoFocus
              className="w-full h-14 pl-4 pr-16 bg-white border-2 border-slate-300 focus:border-blue-600 rounded-xl text-2xl font-bold font-mono text-slate-900 outline-none transition-colors"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400 font-mono">
              {currentItem.unit}
            </span>
          </div>
        </div>

        {/* Real-time Calculation Result (No Calculate Button) */}
        {evaluation.isCheckInputWarning ? (
          // Input Error Warning (Typo guardrail)
          <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <span>⚠ CHECK INPUT</span>
            </div>
            <p className="text-xs text-amber-900">
              {evaluation.message}
            </p>
            <button
              onClick={handleReEnter}
              className="w-full py-2.5 bg-amber-600 active:bg-amber-700 text-white font-bold text-xs rounded-lg uppercase tracking-wider flex items-center justify-center gap-1.5 min-h-[44px]"
            >
              <RotateCcw className="w-4 h-4" />
              RE-ENTER
            </button>
          </div>
        ) : evaluation.result === 'OK' && inputValue !== '' ? (
          // Real-time OK
          <div className="p-4 bg-emerald-50 border-2 border-emerald-400 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow">
                <Check className="w-5 h-5 stroke-[3]" />
              </div>
              <div>
                <span className="text-base font-bold text-emerald-900 block leading-tight">✓ OK</span>
                <span className="text-xs text-emerald-700">Within Standard</span>
              </div>
            </div>
            <div className="text-right font-mono text-xs text-emerald-800">
              Dev: {formatDeviation(evaluation.deviation, currentItem.unit)}
            </div>
          </div>
        ) : evaluation.result === 'NG' && inputValue !== '' ? (
          // Real-time NG Guardrail: Require confirmation or re-measure
          <div className="p-4 bg-red-50 border-2 border-red-300 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center shadow">
                  <X className="w-5 h-5 stroke-[3]" />
                </div>
                <div>
                  <span className="text-base font-bold text-red-900 block leading-tight">✕ NG</span>
                  <span className="text-xs text-red-700">Out of Tolerance</span>
                </div>
              </div>
              <div className="text-right text-xs font-mono text-red-800">
                Deviation: <strong>{formatDeviation(evaluation.deviation, currentItem.unit)}</strong>
              </div>
            </div>

            <div className="text-[11px] text-red-800 bg-red-100/70 p-2 rounded">
              Standard: {currentItem.lowerLimit.toFixed(2)} - {currentItem.upperLimit.toFixed(2)} {currentItem.unit}
              <br />
              Actual: {inputValue} {currentItem.unit}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={handleReEnter}
                className="py-2.5 px-3 bg-white border border-red-300 text-red-700 font-bold text-xs rounded-lg active:bg-red-50 flex items-center justify-center gap-1 min-h-[44px]"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                RE-MEASURE
              </button>
              <button
                onClick={handleConfirmNg}
                className="py-2.5 px-3 bg-red-600 active:bg-red-700 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1 min-h-[44px]"
              >
                CONFIRM NG
              </button>
            </div>
          </div>
        ) : null}

        {/* Correction history indicator if previously modified */}
        {currentItem.correctionHistory.length > 0 && (
          <div className="text-[10px] text-slate-400 font-mono text-right">
            Audit Trace: {currentItem.correctionHistory.length} correction(s) recorded
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="space-y-2">
        <button
          onClick={handleSaveAndNext}
          disabled={evaluation.isCheckInputWarning || inputValue === ''}
          className="w-full py-3.5 px-4 bg-blue-900 active:bg-blue-950 text-white font-bold text-sm rounded-xl uppercase tracking-wider flex items-center justify-center gap-2 shadow-md disabled:opacity-40 min-h-[48px]"
        >
          <span>{currentIndex < measurements.length - 1 ? 'SAVE & NEXT' : 'CONTINUE TO VISUAL'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        {currentIndex > 0 && (
          <button
            onClick={() => setCurrentIndex(currentIndex - 1)}
            className="w-full py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
          >
            ← Previous Measurement
          </button>
        )}
      </div>

      {/* Dimensional Gate Notification if NG or Completed */}
      {isAllMeasurementsRecorded && (
        <div
          className={`p-4 rounded-xl border ${
            hasConfirmedNg
              ? 'bg-red-50 border-red-200 text-red-900'
              : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}
        >
          <div className="flex items-center gap-2 font-bold text-sm">
            {hasConfirmedNg ? (
              <>
                <ShieldAlert className="w-5 h-5 text-red-600" />
                <span>DIMENSIONAL: ✕ NG (Requirement not met)</span>
              </>
            ) : (
              <>
                <Check className="w-5 h-5 text-emerald-600" />
                <span>DIMENSIONAL: ✓ PASS (All measurements OK)</span>
              </>
            )}
          </div>
          <p className="text-xs mt-1 text-slate-600">
            {hasConfirmedNg
              ? 'You may still continue visual and penetrant inspection for failure analysis and AI dataset collection.'
              : 'Dimensional specifications validated. Proceed to AI-assisted visual inspection.'}
          </p>
          <button
            onClick={onNext}
            className="mt-3 w-full py-2.5 bg-slate-900 text-white text-xs font-bold rounded-lg uppercase tracking-wider active:bg-black min-h-[44px]"
          >
            CONTINUE INSPECTION →
          </button>
        </div>
      )}
    </div>
  );
};
