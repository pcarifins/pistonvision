import React, { useState } from 'react';
import { X, CheckCircle, XCircle, BookOpen, ChevronRight, ChevronLeft } from 'lucide-react';
import { VisualCriterion } from '../../types/criteria';
import { OFFICIAL_MANUAL_INFO } from '../../data/criteriaMaster';

interface OfficialReferenceModalProps {
  criterion: VisualCriterion;
  actualImage?: string;
  onClose: () => void;
}

export const OfficialReferenceModal: React.FC<OfficialReferenceModalProps> = ({
  criterion,
  actualImage,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'CRITERIA' | 'EXAMPLES' | 'COMPARE'>('CRITERIA');
  const [exampleIndex, setExampleIndex] = useState(0);

  const samples = criterion.referenceSamples || [];
  const currentSample = samples[exampleIndex] || null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm">
      <div className="w-full max-w-lg max-h-[92vh] flex flex-col bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-4 py-3 bg-[#0F2F57] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-300" />
            <div>
              <h3 className="font-bold text-sm leading-tight">OFFICIAL ENGINEERING STANDARD</h3>
              <p className="text-[10px] text-blue-200 font-mono">
                {criterion.inspectionArea} • {OFFICIAL_MANUAL_INFO.manualNumber} ({OFFICIAL_MANUAL_INFO.revision})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-3 border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
          <button
            onClick={() => setActiveTab('CRITERIA')}
            className={`py-2.5 text-center border-b-2 transition-colors ${
              activeTab === 'CRITERIA'
                ? 'border-blue-600 text-blue-700 bg-white'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            CRITERIA
          </button>
          <button
            onClick={() => setActiveTab('EXAMPLES')}
            className={`py-2.5 text-center border-b-2 transition-colors ${
              activeTab === 'EXAMPLES'
                ? 'border-blue-600 text-blue-700 bg-white'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            EXAMPLES ({samples.length})
          </button>
          <button
            onClick={() => setActiveTab('COMPARE')}
            className={`py-2.5 text-center border-b-2 transition-colors ${
              activeTab === 'COMPARE'
                ? 'border-blue-600 text-blue-700 bg-white'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            COMPARE
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 overflow-y-auto space-y-4 text-slate-800 text-xs leading-relaxed flex-1">
          {activeTab === 'CRITERIA' && (
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <span className="font-bold text-blue-900 block mb-1">GENERAL SPECIFICATION</span>
                <p className="text-slate-700">{criterion.criterionText}</p>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <div className="flex items-center gap-1.5 text-emerald-800 font-bold mb-1">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  ACCEPTANCE CRITERIA (OK)
                </div>
                <p className="text-slate-700">{criterion.acceptanceCriteria}</p>
              </div>

              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-1.5 text-red-800 font-bold mb-1">
                  <XCircle className="w-4 h-4 text-red-600" />
                  REJECTION CRITERIA (NG)
                </div>
                <p className="text-slate-700">{criterion.rejectionCriteria}</p>
              </div>

              <div className="pt-2 text-[11px] text-slate-500 font-mono">
                Approved Reman Manual: {OFFICIAL_MANUAL_INFO.manualTitle} | Effective Date: {criterion.effectiveDate}
              </div>
            </div>
          )}

          {activeTab === 'EXAMPLES' && currentSample && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded font-bold text-[11px] ${
                    currentSample.type === 'OK'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-red-100 text-red-800 border border-red-300'
                  }`}
                >
                  {currentSample.type === 'OK' ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                  {currentSample.type} SAMPLE
                </span>

                <div className="flex items-center gap-1">
                  <button
                    disabled={exampleIndex === 0}
                    onClick={() => setExampleIndex((prev) => Math.max(0, prev - 1))}
                    className="p-1 rounded bg-slate-100 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {exampleIndex + 1} / {samples.length}
                  </span>
                  <button
                    disabled={exampleIndex === samples.length - 1}
                    onClick={() => setExampleIndex((prev) => Math.min(samples.length - 1, prev + 1))}
                    className="p-1 rounded bg-slate-100 disabled:opacity-40"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Standard Technical Diagram Schematic */}
              <div className="w-full aspect-[4/3] bg-slate-900 rounded-lg flex flex-col items-center justify-center p-4 border border-slate-700 text-center relative overflow-hidden">
                {/* Visual schematic representation of the authorized Komatsu standard */}
                <div className="w-full h-full flex flex-col items-center justify-center border border-dashed border-slate-600 rounded p-4">
                  <div className="text-slate-400 text-[10px] font-mono uppercase tracking-widest mb-2">
                    OFFICIAL REMAN REFERENCE DRAWING • {criterion.areaCode}
                  </div>
                  <div className="text-white font-bold text-sm mb-1">{currentSample.title}</div>
                  <div className="text-slate-300 text-xs max-w-xs">{currentSample.description}</div>
                  {currentSample.defectClass && (
                    <div className="mt-3 px-2 py-0.5 bg-red-950 text-red-300 border border-red-800 rounded text-[10px] font-mono">
                      Defect Code: {currentSample.defectClass}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'COMPARE' && (
            <div className="space-y-3">
              <p className="text-[11px] text-slate-600 font-medium">
                Side-by-side comparison with authorized Reman criteria.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col border border-slate-200 rounded-lg overflow-hidden">
                  <div className="bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-700 text-center">
                    CAPTURED PHOTO
                  </div>
                  <div className="aspect-square bg-slate-900 flex items-center justify-center overflow-hidden">
                    {actualImage ? (
                      <img src={actualImage} alt="Captured" className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-slate-400 text-[10px] text-center px-2">No photo captured yet</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col border border-slate-200 rounded-lg overflow-hidden">
                  <div className="bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-700 text-center">
                    STANDARD LIMIT
                  </div>
                  <div className="aspect-square bg-blue-950 p-2 flex flex-col justify-center text-white text-[11px] text-center">
                    <span className="font-bold text-emerald-400 mb-1">OK Standard:</span>
                    <span className="text-[10px] text-slate-300 leading-tight">
                      {criterion.acceptanceCriteria.substring(0, 110)}...
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-100 border-t border-slate-200">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-blue-900 text-white font-semibold text-xs rounded-lg active:bg-blue-950 uppercase tracking-wider"
          >
            RETURN TO INSPECTION
          </button>
        </div>
      </div>
    </div>
  );
};
