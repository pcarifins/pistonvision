import React, { useState, useEffect } from 'react';
import { Check, X, AlertTriangle, ArrowRight, BookOpen, RotateCcw, ShieldCheck, Flame } from 'lucide-react';
import { InspectionRecord, PenetrantInspectionRecord, JudgmentResult } from '../../types/inspection';
import { PENETRANT_CRITERIA_MASTER } from '../../data/criteriaMaster';
import { LiveCamera } from './LiveCamera';
import { analyzeImageQuality, ImageQualityResult } from '../../utils/imageQuality';
import { aiService } from '../../services/aiService';
import { dbService } from '../../services/db';
import { AIModelProfile, DatasetItem } from '../../types/ai';

interface PenetrantStepProps {
  inspection: InspectionRecord;
  onUpdateInspection: (updated: InspectionRecord) => void;
  onNext: () => void;
  onPrev: () => void;
}

export const PenetrantStep: React.FC<PenetrantStepProps> = ({
  inspection,
  onUpdateInspection,
  onNext,
  onPrev,
}) => {
  const ptRecord = inspection.penetrantInspection;
  const criterion = PENETRANT_CRITERIA_MASTER;

  const [activeModel, setActiveModel] = useState<AIModelProfile | null>(null);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(
    ptRecord.capturedImageDataUrl || null
  );
  const [qualityCheck, setQualityCheck] = useState<ImageQualityResult | null>(null);
  const [inspectorJudgment, setInspectorJudgment] = useState<JudgmentResult>(
    ptRecord.inspectorJudgment || 'PENDING'
  );
  const [remarks, setRemarks] = useState<string>(ptRecord.inspectorRemarks || '');
  const [showStandardModal, setShowStandardModal] = useState(false);

  useEffect(() => {
    dbService.getActiveModelProfile().then(setActiveModel);
  }, []);

  const handlePhotoCaptured = async (dataUrl: string) => {
    setPhotoDataUrl(dataUrl);

    const imageId = `IMG-${inspection.inspectionId}-PT-${Date.now()}`;
    await dbService.saveImage(imageId, inspection.inspectionId, dataUrl);

    const quality = await analyzeImageQuality(dataUrl);
    setQualityCheck(quality);

    const currentModel = activeModel || (await dbService.getActiveModelProfile());
    const aiPrediction = await aiService.runInference(
      dataUrl,
      'Penetrant Inspection',
      currentModel
    );

    const updatedPt: PenetrantInspectionRecord = {
      ...ptRecord,
      capturedImageId: imageId,
      capturedImageDataUrl: dataUrl,
      imageQualityScore: quality.score,
      imageQualityStatus: quality.status,
      aiPrediction,
      inspectedAt: new Date().toISOString(),
    };

    onUpdateInspection({
      ...inspection,
      penetrantInspection: updatedPt,
    });
  };

  const handleRetake = () => {
    setPhotoDataUrl(null);
    setQualityCheck(null);
  };

  const handleSaveAndNext = async () => {
    if (inspectorJudgment === 'PENDING') return;

    if (inspectorJudgment === 'NG' && !remarks) {
      alert('Please describe the observed crack/bleed-out for confirmed NG.');
      return;
    }

    if (inspectorJudgment === 'REVIEW' && !remarks) {
      alert('Please enter Reason/Remarks for review items.');
      return;
    }

    const updatedPt: PenetrantInspectionRecord = {
      ...ptRecord,
      inspectorJudgment,
      inspectorRemarks: remarks || (inspectorJudgment === 'OK' ? 'No crack indications detected.' : ''),
      isCompleted: true,
      inspectedAt: new Date().toISOString(),
    };

    const nextInspection = {
      ...inspection,
      penetrantInspection: updatedPt,
      penetrantResult: inspectorJudgment,
    };

    // Save as dataset entry if image is captured
    if (updatedPt.capturedImageId && photoDataUrl) {
      const datasetEntry: DatasetItem = {
        imageId: updatedPt.capturedImageId,
        inspectionId: inspection.inspectionId,
        joNumber: inspection.joNumber,
        engineModel: inspection.engineModel,
        partNumber: inspection.partNumber,
        pistonPosition: inspection.pistonPosition,
        inspectionType: 'PENETRANT',
        inspectionArea: 'Penetrant Inspection',
        imageTimestamp: new Date().toISOString(),
        inspectorJudgment,
        defectClass: inspectorJudgment === 'NG' ? 'Crack Indication' : undefined,
        verificationStatus: 'VERIFIED',
        manualRevision: criterion.revision,
      };
      await dbService.saveDatasetItem(datasetEntry);
    }

    onUpdateInspection(nextInspection);
    onNext();
  };

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col gap-4 pb-20">
      {/* Penetrant Header Card */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase font-mono block">
              STAGE 3 • SPECIALIZED TESTING
            </span>
            <h2 className="text-sm font-bold text-slate-900 leading-tight">
              Dye Penetrant Inspection (PT)
            </h2>
          </div>
        </div>

        <button
          onClick={() => setShowStandardModal(true)}
          className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-900 font-bold rounded-lg text-xs"
        >
          <BookOpen className="w-3.5 h-3.5 text-blue-700" />
          PT STANDARD
        </button>
      </div>

      {/* Main Content */}
      {!photoDataUrl ? (
        <div className="space-y-3">
          <LiveCamera
            areaTitle="Dye Penetrant Inspection"
            onCapture={handlePhotoCaptured}
            onOpenReference={() => setShowStandardModal(true)}
          />

          <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-xs text-purple-950 space-y-1">
            <span className="font-bold text-purple-900 block">PT STANDARD SPECIFICATION</span>
            <p className="text-[11px] text-purple-900/90 leading-relaxed">
              {criterion.linearIndicationRule}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Captured Penetrant Photo */}
          <div className="relative aspect-[4/3] w-full bg-slate-950 rounded-xl overflow-hidden border border-slate-700 shadow">
            <img
              src={photoDataUrl}
              alt="Penetrant Inspection"
              className="w-full h-full object-contain"
            />
            <button
              onClick={handleRetake}
              className="absolute top-2 right-2 px-3 py-1.5 bg-black/75 backdrop-blur text-white font-semibold text-xs rounded-lg flex items-center gap-1 active:bg-black"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Retake
            </button>
            <div className="absolute bottom-2 left-2 px-2.5 py-0.5 bg-black/70 backdrop-blur rounded text-[11px] text-emerald-400 font-mono">
              Saved on Device ✓
            </div>
          </div>

          {/* Quality Indicator */}
          {qualityCheck && (
            <div
              className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                qualityCheck.isAcceptable
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50 border-amber-300 text-amber-900'
              }`}
            >
              <div className="flex items-center gap-2">
                {qualityCheck.isAcceptable ? (
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                )}
                <div>
                  <span className="font-bold block">
                    {qualityCheck.isAcceptable ? '✓ IMAGE QUALITY OK' : '⚠ IMAGE QUALITY WARNING'}
                  </span>
                  <span className="text-[11px] text-slate-600">{qualityCheck.message}</span>
                </div>
              </div>
            </div>
          )}

          {/* AI Penetrant Analysis */}
          <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                AI PENETRANT ANALYSIS
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {activeModel?.status === 'EXPERIMENTAL' ? 'EXPERIMENTAL AI' : 'DATASET COLLECTION MODE'}
              </span>
            </div>

            {activeModel?.status === 'EXPERIMENTAL' && ptRecord.aiPrediction?.hasDetection ? (
              <div className="p-2.5 bg-purple-50 border border-purple-200 rounded-lg text-xs space-y-1">
                <div className="flex items-center justify-between font-bold text-purple-950">
                  <span>Linear Indication Detected</span>
                  <span className="text-[11px] px-1.5 py-0.2 bg-purple-200 rounded font-mono">
                    Detection Confidence: {ptRecord.aiPrediction.confidence}%
                  </span>
                </div>
                <div className="text-[11px] text-slate-600">
                  Location: Combustion Bowl Rim Lip • AI Suggestion: <strong>REVIEW</strong>
                </div>
                <p className="text-[10px] text-purple-800 italic pt-0.5">
                  Reman Manual: Zero linear indication permitted. Inspector verification mandatory.
                </p>
              </div>
            ) : (
              <div className="p-2.5 bg-slate-50 rounded-lg text-xs text-slate-600 space-y-1">
                <div className="font-bold text-slate-800">DATASET COLLECTION MODE</div>
                <p className="text-[11px] text-slate-500">
                  AI Model Not Trained. Verify penetrant indications manually under standard inspection lighting.
                </p>
              </div>
            )}
          </div>

          {/* Inspector Judgment Control */}
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block font-mono">
              INSPECTOR JUDGMENT (PENETRANT)
            </label>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setInspectorJudgment('OK')}
                className={`py-3 px-2 rounded-xl border-2 font-bold text-xs uppercase tracking-wider flex flex-col items-center justify-center gap-1 min-h-[50px] transition-all ${
                  inspectorJudgment === 'OK'
                    ? 'bg-emerald-600 border-emerald-700 text-white shadow-md'
                    : 'bg-emerald-50/50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                }`}
              >
                <Check className="w-5 h-5 stroke-[3]" />
                ✓ OK
              </button>

              <button
                type="button"
                onClick={() => setInspectorJudgment('NG')}
                className={`py-3 px-2 rounded-xl border-2 font-bold text-xs uppercase tracking-wider flex flex-col items-center justify-center gap-1 min-h-[50px] transition-all ${
                  inspectorJudgment === 'NG'
                    ? 'bg-red-600 border-red-700 text-white shadow-md'
                    : 'bg-red-50/50 border-red-200 text-red-800 hover:bg-red-100'
                }`}
              >
                <X className="w-5 h-5 stroke-[3]" />
                ✕ NG
              </button>

              <button
                type="button"
                onClick={() => setInspectorJudgment('REVIEW')}
                className={`py-3 px-2 rounded-xl border-2 font-bold text-xs uppercase tracking-wider flex flex-col items-center justify-center gap-1 min-h-[50px] transition-all ${
                  inspectorJudgment === 'REVIEW'
                    ? 'bg-amber-500 border-amber-600 text-white shadow-md'
                    : 'bg-amber-50/50 border-amber-200 text-amber-800 hover:bg-amber-100'
                }`}
              >
                <AlertTriangle className="w-5 h-5" />
                ⚠ REVIEW
              </button>
            </div>

            {/* Remarks */}
            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                {inspectorJudgment === 'NG'
                  ? 'Defect Finding (Mandatory for NG)'
                  : inspectorJudgment === 'REVIEW'
                  ? 'Reason for Review (Mandatory)'
                  : 'Inspector Remarks (Optional)'}
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder={
                  inspectorJudgment === 'NG'
                    ? 'e.g. Red linear bleed indication observed along bowl lip'
                    : 'e.g. Developer clear, no indications observed'
                }
                rows={2}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 outline-none"
              />
            </div>
          </div>

          {/* Action Button */}
          <div className="space-y-2">
            <button
              onClick={handleSaveAndNext}
              disabled={inspectorJudgment === 'PENDING'}
              className="w-full py-3.5 px-4 bg-blue-900 active:bg-blue-950 text-white font-bold text-sm rounded-xl uppercase tracking-wider flex items-center justify-center gap-2 shadow-md disabled:opacity-40 min-h-[48px]"
            >
              <span>INSPECTION SUMMARY & FINAL JUDGMENT</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onPrev}
              className="w-full py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              ← Back to Visual Inspection
            </button>
          </div>
        </div>
      )}

      {/* PT Standard Modal */}
      {showStandardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white rounded-xl p-5 shadow-2xl space-y-3 text-xs text-slate-800">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-sm text-slate-900">OFFICIAL PENETRANT STANDARD</h3>
              <button
                onClick={() => setShowStandardModal(false)}
                className="text-slate-400 hover:text-slate-800"
              >
                ✕
              </button>
            </div>
            <div>
              <strong className="block text-slate-900 mb-1">Linear Indication Rule:</strong>
              <p className="text-slate-600 leading-relaxed">{criterion.linearIndicationRule}</p>
            </div>
            <div>
              <strong className="block text-slate-900 mb-1">Non-Linear Indication Rule:</strong>
              <p className="text-slate-600 leading-relaxed">{criterion.nonLinearIndicationRule}</p>
            </div>
            <div className="pt-2 border-t">
              <strong className="block text-slate-900 mb-1">Critical Inspection Areas:</strong>
              <ul className="list-disc pl-4 text-slate-600 space-y-0.5">
                {criterion.criticalAreas.map((area, i) => (
                  <li key={i}>{area}</li>
                ))}
              </ul>
            </div>
            <button
              onClick={() => setShowStandardModal(false)}
              className="w-full mt-3 py-2.5 bg-blue-900 text-white font-semibold text-xs rounded-lg active:bg-blue-950"
            >
              CLOSE
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
