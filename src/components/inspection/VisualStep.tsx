import React, { useState, useEffect } from 'react';
import { Check, X, AlertTriangle, ArrowRight, BookOpen, Camera, ShieldCheck, ChevronRight, RotateCcw } from 'lucide-react';
import { InspectionRecord, VisualAreaInspection, JudgmentResult } from '../../types/inspection';
import { VisualCriterion } from '../../types/criteria';
import { VISUAL_CRITERIA_MASTER } from '../../data/criteriaMaster';
import { LiveCamera } from './LiveCamera';
import { OfficialReferenceModal } from './OfficialReferenceModal';
import { analyzeImageQuality, ImageQualityResult } from '../../utils/imageQuality';
import { aiService } from '../../services/aiService';
import { dbService } from '../../services/db';
import { AIModelProfile, DefectClass, DatasetItem } from '../../types/ai';

interface VisualStepProps {
  inspection: InspectionRecord;
  onUpdateInspection: (updated: InspectionRecord) => void;
  onNext: () => void;
  onPrev: () => void;
}

export const VisualStep: React.FC<VisualStepProps> = ({
  inspection,
  onUpdateInspection,
  onNext,
  onPrev,
}) => {
  const visualList = inspection.visualInspections;
  const currentIndex = inspection.currentVisualIndex || 0;
  const currentArea = visualList[currentIndex] || visualList[0];

  const criterion: VisualCriterion =
    VISUAL_CRITERIA_MASTER.find((c) => c.areaCode === currentArea?.areaCode) ||
    VISUAL_CRITERIA_MASTER[0];

  const [showReferenceModal, setShowReferenceModal] = useState(false);
  const [activeModel, setActiveModel] = useState<AIModelProfile | null>(null);

  // Flow states for current area:
  // 'CAMERA' -> 'CAPTURED_REVIEW' (with quality check & AI analysis)
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(
    currentArea?.capturedImageDataUrl || null
  );
  const [qualityCheck, setQualityCheck] = useState<ImageQualityResult | null>(null);
  const [isAnalyzingQuality, setIsAnalyzingQuality] = useState(false);

  // Inspector form fields
  const [inspectorJudgment, setInspectorJudgment] = useState<JudgmentResult>(
    currentArea?.inspectorJudgment || 'PENDING'
  );
  const [defectType, setDefectType] = useState<string>(currentArea?.inspectorDefectType || '');
  const [defectLocation, setDefectLocation] = useState<string>(
    currentArea?.inspectorDefectLocation || ''
  );
  const [remarks, setRemarks] = useState<string>(currentArea?.inspectorRemarks || '');

  // Load model profile on mount
  useEffect(() => {
    dbService.getActiveModelProfile().then(setActiveModel);
  }, []);

  // Sync state whenever switching area
  useEffect(() => {
    if (currentArea) {
      setPhotoDataUrl(currentArea.capturedImageDataUrl || null);
      setInspectorJudgment(currentArea.inspectorJudgment || 'PENDING');
      setDefectType(currentArea.inspectorDefectType || '');
      setDefectLocation(currentArea.inspectorDefectLocation || '');
      setRemarks(currentArea.inspectorRemarks || '');

      if (currentArea.imageQualityStatus) {
        setQualityCheck({
          isAcceptable: currentArea.imageQualityStatus === 'OK',
          status: currentArea.imageQualityStatus,
          message:
            currentArea.imageQualityStatus === 'OK'
              ? 'Image Quality Acceptable'
              : `Image Quality: ${currentArea.imageQualityStatus}`,
          score: currentArea.imageQualityScore || 80,
        });
      } else {
        setQualityCheck(null);
      }
    }
  }, [currentIndex, currentArea]);

  // Handle Photo Capture
  const handlePhotoCaptured = async (dataUrl: string) => {
    setPhotoDataUrl(dataUrl);
    setIsAnalyzingQuality(true);

    const imageId = `IMG-${inspection.inspectionId}-${currentArea.areaCode}-${Date.now()}`;

    // 1. FIRST: Save original image in IndexedDB immediately (Requirement 14)
    await dbService.saveImage(imageId, inspection.inspectionId, dataUrl);

    // 2. Deterministic Image Quality Check (Requirement 15)
    const quality = await analyzeImageQuality(dataUrl);
    setQualityCheck(quality);
    setIsAnalyzingQuality(false);

    // 3. AI Analysis according to model mode (Requirements 17, 18, 19)
    const currentModel = activeModel || (await dbService.getActiveModelProfile());
    const aiPrediction = await aiService.runInference(
      dataUrl,
      currentArea.inspectionArea,
      currentModel
    );

    // Update inspection record locally
    const updatedAreas = visualList.map((item, idx) => {
      if (idx === currentIndex) {
        return {
          ...item,
          capturedImageId: imageId,
          capturedImageDataUrl: dataUrl,
          imageQualityScore: quality.score,
          imageQualityStatus: quality.status,
          aiPrediction,
          inspectedAt: new Date().toISOString(),
        };
      }
      return item;
    });

    onUpdateInspection({
      ...inspection,
      visualInspections: updatedAreas,
      currentVisualIndex: currentIndex,
    });
  };

  const handleRetakePhoto = () => {
    setPhotoDataUrl(null);
    setQualityCheck(null);
  };

  const handleJudgmentSelect = (judgment: JudgmentResult) => {
    setInspectorJudgment(judgment);

    // If judgment is OK, prefill clean remarks
    if (judgment === 'OK') {
      setDefectType('');
      setDefectLocation('');
      if (!remarks) setRemarks('Clean, within specification.');
    }
  };

  const handleSaveAndNext = async () => {
    if (inspectorJudgment === 'PENDING') return;

    // Validate mandatory defect fields if NG
    if (inspectorJudgment === 'NG' && (!defectType || !defectLocation)) {
      alert('Please select the Defect Type and Location for confirmed NG.');
      return;
    }

    // Validate remarks if REVIEW
    if (inspectorJudgment === 'REVIEW' && !remarks) {
      alert('Please enter Reason/Remarks for review items.');
      return;
    }

    const updatedAreas = visualList.map((item, idx) => {
      if (idx === currentIndex) {
        return {
          ...item,
          inspectorJudgment,
          inspectorDefectType: inspectorJudgment === 'NG' ? defectType : undefined,
          inspectorDefectLocation: inspectorJudgment === 'NG' ? defectLocation : undefined,
          inspectorRemarks: remarks,
          isCompleted: true,
          inspectedAt: new Date().toISOString(),
        };
      }
      return item;
    });

    // Check overall visual result
    const anyNg = updatedAreas.some((a) => a.inspectorJudgment === 'NG');
    const anyReview = updatedAreas.some((a) => a.inspectorJudgment === 'REVIEW');
    const allDone = updatedAreas.every((a) => a.isCompleted && a.inspectorJudgment !== 'PENDING');

    const nextVisualResult: JudgmentResult = anyNg
      ? 'NG'
      : anyReview
      ? 'REVIEW'
      : allDone
      ? 'OK'
      : 'PENDING';

    const nextInspection = {
      ...inspection,
      visualInspections: updatedAreas,
      visualResult: nextVisualResult,
      currentVisualIndex: currentIndex,
    };

    // Save as dataset entry if image is captured (Requirement 32)
    if (currentArea.capturedImageId && photoDataUrl) {
      const datasetEntry: DatasetItem = {
        imageId: currentArea.capturedImageId,
        inspectionId: inspection.inspectionId,
        joNumber: inspection.joNumber,
        engineModel: inspection.engineModel,
        partNumber: inspection.partNumber,
        pistonPosition: inspection.pistonPosition,
        inspectionType: 'VISUAL',
        inspectionArea: currentArea.inspectionArea,
        imageTimestamp: new Date().toISOString(),
        inspectorJudgment: inspectorJudgment,
        defectClass: defectType as DefectClass,
        verificationStatus: 'VERIFIED',
        manualRevision: criterion.revision,
      };
      await dbService.saveDatasetItem(datasetEntry);
    }

    onUpdateInspection(nextInspection);

    if (currentIndex < visualList.length - 1) {
      // Advance to next area
      const nextIndex = currentIndex + 1;
      onUpdateInspection({
        ...nextInspection,
        currentVisualIndex: nextIndex,
      });
    } else {
      // Completed all 7 visual areas -> Proceed to Penetrant Inspection
      onNext();
    }
  };

  const handleStepJump = (idx: number) => {
    onUpdateInspection({
      ...inspection,
      currentVisualIndex: idx,
    });
  };

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col gap-4 pb-20">
      {/* Area Progress Tracker */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold text-slate-500 uppercase font-mono block">
            VISUAL AREA {currentIndex + 1} OF {visualList.length}
          </span>
          <h2 className="text-sm font-bold text-slate-900 leading-tight">
            {currentArea.inspectionArea}
          </h2>
        </div>
        <button
          onClick={() => setShowReferenceModal(true)}
          className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-900 font-bold rounded-lg text-xs"
        >
          <BookOpen className="w-3.5 h-3.5 text-blue-700" />
          VIEW STANDARD
        </button>
      </div>

      {/* Visual Area Steps indicator dots */}
      <div className="flex items-center justify-between px-1">
        {visualList.map((item, idx) => (
          <button
            key={idx}
            onClick={() => handleStepJump(idx)}
            className={`h-2 rounded-full transition-all ${
              idx === currentIndex
                ? 'w-8 bg-blue-600'
                : item.inspectorJudgment === 'OK'
                ? 'w-2 bg-emerald-500'
                : item.inspectorJudgment === 'NG'
                ? 'w-2 bg-red-500'
                : item.inspectorJudgment === 'REVIEW'
                ? 'w-2 bg-amber-500'
                : 'w-2 bg-slate-300'
            }`}
          />
        ))}
      </div>

      {/* Main Inspection Area Content */}
      {!photoDataUrl ? (
        // STAGE 1: Live Camera Capture
        <div className="space-y-3">
          <LiveCamera
            areaTitle={currentArea.inspectionArea}
            onCapture={handlePhotoCaptured}
            onOpenReference={() => setShowReferenceModal(true)}
          />

          <div className="p-3 bg-slate-100 rounded-lg text-xs text-slate-600 flex items-start gap-2">
            <span className="font-bold text-slate-800">Criterion:</span>
            <span>{criterion.criterionText}</span>
          </div>
        </div>
      ) : (
        // STAGE 2: Photo Captured -> Image Quality Gate -> AI Suggestion -> Inspector Confirmation
        <div className="space-y-4">
          {/* Captured Image Preview with Quick Retake */}
          <div className="relative aspect-[4/3] w-full bg-slate-950 rounded-xl overflow-hidden border border-slate-700 shadow">
            <img
              src={photoDataUrl}
              alt="Inspected Area"
              className="w-full h-full object-contain"
            />
            <button
              onClick={handleRetakePhoto}
              className="absolute top-2 right-2 px-3 py-1.5 bg-black/75 backdrop-blur text-white font-semibold text-xs rounded-lg flex items-center gap-1 active:bg-black"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Retake
            </button>
            <div className="absolute bottom-2 left-2 px-2.5 py-0.5 bg-black/70 backdrop-blur rounded text-[11px] text-emerald-400 font-mono">
              Saved on Device ✓
            </div>
          </div>

          {/* Image Quality Gate Indicator (Requirement 15) */}
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
              {!qualityCheck.isAcceptable && (
                <button
                  onClick={handleRetakePhoto}
                  className="px-2.5 py-1 bg-amber-600 text-white font-bold rounded text-[11px]"
                >
                  RETAKE
                </button>
              )}
            </div>
          )}

          {/* AI Assistance Section (Requirements 18 & 19) */}
          <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                AI VISUAL INFERENCE
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {activeModel?.status === 'EXPERIMENTAL' ? 'EXPERIMENTAL AI' : 'DATASET COLLECTION MODE'}
              </span>
            </div>

            {activeModel?.status === 'EXPERIMENTAL' && currentArea.aiPrediction?.hasDetection ? (
              // Real AI Detection display (Requirement 19)
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs space-y-1">
                <div className="flex items-center justify-between font-bold text-amber-900">
                  <span>AI DETECTED: {currentArea.aiPrediction.defectClass}</span>
                  <span className="text-[11px] px-1.5 py-0.2 bg-amber-200 rounded font-mono">
                    Detection Confidence: {currentArea.aiPrediction.confidence}%
                  </span>
                </div>
                <div className="text-[11px] text-slate-600">
                  Location: {currentArea.aiPrediction.location} • AI Suggestion: <strong>{currentArea.aiPrediction.aiSuggestion}</strong>
                </div>
                <p className="text-[10px] text-amber-700 italic pt-0.5">
                  Advisory only. Inspector confirmation required below.
                </p>
              </div>
            ) : (
              // Dataset Collection Mode (Requirement 18 - NO FAKE DETECTIONS)
              <div className="p-2.5 bg-slate-50 rounded-lg text-xs text-slate-600 space-y-1">
                <div className="font-bold text-slate-800">DATASET COLLECTION MODE</div>
                <p className="text-[11px] text-slate-500">
                  AI Model Not Trained. Continue manual inspection. Verified images will be cataloged for model fine-tuning.
                </p>
              </div>
            )}
          </div>

          {/* Inspector Confirmation Control (Requirement 20 - Single Judgment Control) */}
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block font-mono">
              INSPECTOR JUDGMENT (FINAL CONFIRMATION)
            </label>

            {/* Large 3-Way Choice Buttons */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleJudgmentSelect('OK')}
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
                onClick={() => handleJudgmentSelect('NG')}
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
                onClick={() => handleJudgmentSelect('REVIEW')}
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

            {/* Mandatory Conditional Fields for NG */}
            {inspectorJudgment === 'NG' && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg space-y-2.5 text-xs text-red-950 animate-fadeIn">
                <span className="font-bold text-xs text-red-900 block uppercase">
                  DEFECT DETAILS (MANDATORY FOR NG)
                </span>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Defect Class</label>
                  <select
                    value={defectType}
                    onChange={(e) => setDefectType(e.target.value)}
                    className="w-full h-10 px-3 bg-white border border-red-300 rounded-lg font-medium text-slate-800 outline-none"
                  >
                    <option value="">-- Select Defect Class --</option>
                    {criterion.approvedDefectClasses.map((cls) => (
                      <option key={cls} value={cls}>
                        {cls}
                      </option>
                    ))}
                    <option value="Other / Unknown">Other / Unknown</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Defect Location / Clock Position</label>
                  <input
                    type="text"
                    value={defectLocation}
                    onChange={(e) => setDefectLocation(e.target.value)}
                    placeholder="e.g. Lip perimeter 2 o'clock / Thrust face"
                    className="w-full h-10 px-3 bg-white border border-red-300 rounded-lg font-medium text-slate-800 outline-none"
                  />
                </div>
              </div>
            )}

            {/* Mandatory Remarks for REVIEW */}
            {inspectorJudgment === 'REVIEW' && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2 text-xs text-amber-950 animate-fadeIn">
                <label className="font-bold text-xs text-amber-900 block uppercase">
                  REASON / REMARKS FOR QC REVIEW (MANDATORY)
                </label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Describe ambiguity, scratch depth vs feel, or reason engineering review is required..."
                  rows={2}
                  className="w-full p-2.5 bg-white border border-amber-300 rounded-lg font-medium text-slate-800 outline-none"
                />
              </div>
            )}

            {/* Optional general remarks for OK */}
            {inspectorJudgment === 'OK' && (
              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">Inspector Remarks (Optional)</label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Surface clean, feed lines visible"
                  className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
                />
              </div>
            )}
          </div>

          {/* Save & Next Action */}
          <div className="space-y-2">
            <button
              onClick={handleSaveAndNext}
              disabled={inspectorJudgment === 'PENDING'}
              className="w-full py-3.5 px-4 bg-blue-900 active:bg-blue-950 text-white font-bold text-sm rounded-xl uppercase tracking-wider flex items-center justify-center gap-2 shadow-md disabled:opacity-40 min-h-[48px]"
            >
              <span>{currentIndex < visualList.length - 1 ? 'SAVE & NEXT AREA' : 'CONTINUE TO PENETRANT'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onPrev}
              className="w-full py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              ← Back to Dimensional
            </button>
          </div>
        </div>
      )}

      {/* Official Reference Modal */}
      {showReferenceModal && (
        <OfficialReferenceModal
          criterion={criterion}
          actualImage={photoDataUrl || undefined}
          onClose={() => setShowReferenceModal(false)}
        />
      )}
    </div>
  );
};
