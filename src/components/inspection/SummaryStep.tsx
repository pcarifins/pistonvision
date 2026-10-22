import React, { useState } from 'react';
import { Check, X, AlertTriangle, FileDown, CloudUpload, ArrowLeft, RotateCcw, ShieldAlert, Award } from 'lucide-react';
import { InspectionRecord } from '../../types/inspection';
import { evaluateInspectionCompletenessAndResult } from '../../utils/ruleEngine';
import { generatePistonQCPdf } from '../../services/pdfService';
import { syncService } from '../../services/syncService';
import { dbService } from '../../services/db';

interface SummaryStepProps {
  inspection: InspectionRecord;
  onUpdateInspection: (updated: InspectionRecord) => void;
  onFinishInspection: () => void;
  onBackToStep: (step: 'DIMENSIONAL' | 'VISUAL' | 'PENETRANT') => void;
}

export const SummaryStep: React.FC<SummaryStepProps> = ({
  inspection,
  onUpdateInspection,
  onFinishInspection,
  onBackToStep,
}) => {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Run deterministic rule engine
  const evaluation = evaluateInspectionCompletenessAndResult(inspection);

  // Final decision banner configuration
  const getBannerDetails = () => {
    switch (evaluation.finalDecision) {
      case 'REUSE':
        return {
          title: '✓ REUSE PERMITTED',
          subtitle: 'All dimensional, visual, and penetrant criteria verified OK.',
          bgColor: 'bg-emerald-600',
          textColor: 'text-white',
          badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-300',
        };
      case 'NG_REPLACE':
        return {
          title: '✕ NG / REPLACE',
          subtitle: 'Mandatory engineering criteria failed. Piston must be condemned/replaced.',
          bgColor: 'bg-red-600',
          textColor: 'text-white',
          badgeBg: 'bg-red-50 text-red-800 border-red-300',
        };
      case 'QC_REVIEW':
        return {
          title: '⚠ QC / ENGINEERING REVIEW',
          subtitle: 'Pending engineering review sign-off before reuse decision.',
          bgColor: 'bg-amber-500',
          textColor: 'text-slate-950',
          badgeBg: 'bg-amber-50 text-amber-800 border-amber-300',
        };
      case 'INCOMPLETE':
      default:
        return {
          title: 'INCOMPLETE INSPECTION',
          subtitle: 'Mandatory inspection points must be recorded before finalization.',
          bgColor: 'bg-slate-700',
          textColor: 'text-white',
          badgeBg: 'bg-slate-100 text-slate-800 border-slate-300',
        };
    }
  };

  const banner = getBannerDetails();

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const doc = generatePistonQCPdf({
        ...inspection,
        finalDecision: evaluation.finalDecision,
        finalizedAt: inspection.finalizedAt || new Date().toISOString(),
      });
      doc.save(`Piston_QC_${inspection.joNumber || 'Checksheet'}.pdf`);

      onUpdateInspection({
        ...inspection,
        pdfGenerated: true,
        pdfGeneratedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('PDF generation error:', err);
      alert('Unable to generate PDF checksheet on this device.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleFinalizeAndSave = async () => {
    if (!evaluation.isComplete) {
      alert('Cannot finalize: some mandatory inspection items are missing.');
      return;
    }

    const updated: InspectionRecord = {
      ...inspection,
      currentStep: 'COMPLETED',
      finalDecision: evaluation.finalDecision,
      dimensionalResult: evaluation.dimensionalResult,
      visualResult: evaluation.visualResult,
      penetrantResult: evaluation.penetrantResult,
      finalizedAt: new Date().toISOString(),
      syncStatus: syncService.isOnline() ? 'PENDING_SYNC' : 'SAVED_LOCALLY',
    };

    await dbService.saveInspection(updated);
    onUpdateInspection(updated);

    // Trigger cloud background sync if online
    if (syncService.isOnline()) {
      setIsSyncing(true);
      setSyncFeedback('Synchronizing inspection record to Cloud...');
      const success = await syncService.syncInspection(updated.inspectionId);
      setIsSyncing(false);
      setSyncFeedback(success ? 'Synced to Cloud ✓' : 'Cloud sync pending.');
    }

    onFinishInspection();
  };

  const handleRetrySyncNow = async () => {
    setIsSyncing(true);
    const success = await syncService.syncInspection(inspection.inspectionId);
    setIsSyncing(false);
    setSyncFeedback(success ? 'Synced to Cloud ✓' : 'Sync error. Queued for auto-sync.');
  };

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col gap-4 pb-24">
      {/* Final Decision Banner */}
      <div className={`p-5 rounded-2xl shadow-md ${banner.bgColor} ${banner.textColor} space-y-1.5`}>
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-widest font-mono opacity-80">FINAL RESULT</span>
          <span className="text-xs font-mono opacity-80">{inspection.joNumber}</span>
        </div>
        <h1 className="text-2xl font-black tracking-tight">{banner.title}</h1>
        <p className="text-xs leading-relaxed opacity-90">{banner.subtitle}</p>
      </div>

      {/* Summary Scorecard of 3 Mandatory Sections */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-700 uppercase tracking-wide flex items-center justify-between">
          <span>INSPECTION CHECKPOINTS</span>
          <span className="text-[10px] text-slate-400 font-mono">SECTIONS 1–3</span>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {/* Dimensional Checkpoint */}
          <div className="p-3.5 flex items-center justify-between">
            <div>
              <span className="font-bold text-slate-900 block text-sm">1. DIMENSIONAL</span>
              <span className="text-[11px] text-slate-500">
                {inspection.dimensionalMeasurements.length} Points Measured
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`px-2.5 py-1 rounded-lg font-bold text-xs ${
                  evaluation.dimensionalResult === 'OK'
                    ? 'bg-emerald-100 text-emerald-800'
                    : evaluation.dimensionalResult === 'NG'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {evaluation.dimensionalResult === 'OK' && '✓ OK'}
                {evaluation.dimensionalResult === 'NG' && '✕ NG'}
                {evaluation.dimensionalResult === 'PENDING' && 'PENDING'}
              </span>
              <button
                onClick={() => onBackToStep('DIMENSIONAL')}
                className="text-[11px] text-blue-700 underline font-medium"
              >
                Edit
              </button>
            </div>
          </div>

          {/* Visual Checkpoint */}
          <div className="p-3.5 flex items-center justify-between">
            <div>
              <span className="font-bold text-slate-900 block text-sm">2. VISUAL (AI-ASSISTED)</span>
              <span className="text-[11px] text-slate-500">
                {inspection.visualInspections.length} Areas Inspected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`px-2.5 py-1 rounded-lg font-bold text-xs ${
                  evaluation.visualResult === 'OK'
                    ? 'bg-emerald-100 text-emerald-800'
                    : evaluation.visualResult === 'NG'
                    ? 'bg-red-100 text-red-800'
                    : evaluation.visualResult === 'REVIEW'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {evaluation.visualResult === 'OK' && '✓ OK'}
                {evaluation.visualResult === 'NG' && '✕ NG'}
                {evaluation.visualResult === 'REVIEW' && '⚠ REVIEW'}
                {evaluation.visualResult === 'PENDING' && 'PENDING'}
              </span>
              <button
                onClick={() => onBackToStep('VISUAL')}
                className="text-[11px] text-blue-700 underline font-medium"
              >
                Edit
              </button>
            </div>
          </div>

          {/* Penetrant Checkpoint */}
          <div className="p-3.5 flex items-center justify-between">
            <div>
              <span className="font-bold text-slate-900 block text-sm">3. PENETRANT (PT)</span>
              <span className="text-[11px] text-slate-500">Dye Penetrant Testing</span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`px-2.5 py-1 rounded-lg font-bold text-xs ${
                  evaluation.penetrantResult === 'OK'
                    ? 'bg-emerald-100 text-emerald-800'
                    : evaluation.penetrantResult === 'NG'
                    ? 'bg-red-100 text-red-800'
                    : evaluation.penetrantResult === 'REVIEW'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {evaluation.penetrantResult === 'OK' && '✓ OK'}
                {evaluation.penetrantResult === 'NG' && '✕ NG'}
                {evaluation.penetrantResult === 'REVIEW' && '⚠ REVIEW'}
                {evaluation.penetrantResult === 'PENDING' && 'PENDING'}
              </span>
              <button
                onClick={() => onBackToStep('PENETRANT')}
                className="text-[11px] text-blue-700 underline font-medium"
              >
                Edit
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Incomplete / Missing warnings if applicable */}
      {!evaluation.isComplete && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl space-y-2 text-xs text-amber-950">
          <div className="flex items-center gap-2 font-bold text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>INSPECTION INCOMPLETE</span>
          </div>
          <ul className="list-disc pl-4 space-y-0.5 text-amber-900">
            {evaluation.missingItems.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Rejection / NG details if applicable */}
      {evaluation.rejectionReasons.length > 0 && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-2 text-xs text-red-950">
          <div className="flex items-center gap-2 font-bold text-red-900">
            <ShieldAlert className="w-4 h-4 text-red-600" />
            <span>CONFIRMED REJECTION CAUSES</span>
          </div>
          <ul className="list-disc pl-4 space-y-0.5 text-red-900">
            {evaluation.rejectionReasons.map((reason, idx) => (
              <li key={idx}>{reason}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Synchronize & PDF Action Controls */}
      <div className="space-y-2.5 pt-2">
        <button
          onClick={handleDownloadPdf}
          disabled={isGeneratingPdf}
          className="w-full py-3 px-4 bg-white border-2 border-slate-300 active:bg-slate-100 text-slate-800 font-bold text-xs rounded-xl uppercase tracking-wider flex items-center justify-center gap-2 min-h-[46px] shadow-sm"
        >
          <FileDown className="w-4 h-4 text-blue-700" />
          {isGeneratingPdf ? 'Generating PDF...' : 'GENERATE PDF CHECKSHEET'}
        </button>

        <button
          onClick={handleFinalizeAndSave}
          disabled={!evaluation.isComplete || isSyncing}
          className="w-full py-3.5 px-4 bg-blue-900 active:bg-blue-950 text-white font-bold text-sm rounded-xl uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg disabled:opacity-40 min-h-[48px]"
        >
          <Award className="w-4 h-4 text-emerald-400" />
          <span>{isSyncing ? 'SAVING & SYNCING...' : 'FINALIZE INSPECTION'}</span>
        </button>

        {syncFeedback && (
          <div className="text-center text-xs font-semibold text-slate-600">
            {syncFeedback}
          </div>
        )}

        {inspection.syncStatus === 'SYNC_ERROR' && (
          <button
            onClick={handleRetrySyncNow}
            className="w-full py-2 text-xs font-semibold text-amber-700 underline flex items-center justify-center gap-1"
          >
            <CloudUpload className="w-3.5 h-3.5" />
            Retry Cloud Synchronization
          </button>
        )}
      </div>
    </div>
  );
};
