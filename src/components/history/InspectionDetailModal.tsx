import React, { useState } from 'react';
import { X, FileDown, CloudUpload, CheckCircle, XCircle, AlertTriangle, ArrowLeft } from 'lucide-react';
import { InspectionRecord } from '../../types/inspection';
import { generatePistonQCPdf } from '../../services/pdfService';
import { syncService } from '../../services/syncService';

interface InspectionDetailModalProps {
  inspection: InspectionRecord;
  onClose: () => void;
  onRefresh: () => void;
}

export const InspectionDetailModal: React.FC<InspectionDetailModalProps> = ({
  inspection,
  onClose,
  onRefresh,
}) => {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleDownloadPdf = () => {
    setIsGeneratingPdf(true);
    try {
      const doc = generatePistonQCPdf(inspection);
      doc.save(`Piston_QC_${inspection.joNumber}.pdf`);
    } catch (e) {
      console.error(e);
      alert('Error generating PDF checksheet.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleRetrySync = async () => {
    setIsSyncing(true);
    await syncService.syncInspection(inspection.inspectionId);
    setIsSyncing(false);
    onRefresh();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm">
      <div className="w-full max-w-lg max-h-[92vh] flex flex-col bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-4 py-3 bg-[#0F2F57] text-white flex items-center justify-between">
          <div>
            <span className="text-[10px] text-blue-200 uppercase font-mono block">INSPECTION RECORD</span>
            <h3 className="font-bold text-sm leading-tight font-mono">{inspection.joNumber}</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs text-slate-800 flex-1">
          {/* Final Result Card */}
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between ${
              inspection.finalDecision === 'REUSE'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                : inspection.finalDecision === 'NG_REPLACE'
                ? 'bg-red-50 border-red-300 text-red-950'
                : 'bg-amber-50 border-amber-300 text-amber-950'
            }`}
          >
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider font-mono block">
                FINAL REUSE DECISION
              </span>
              <span className="text-base font-black">
                {inspection.finalDecision === 'REUSE' && '✓ REUSE PERMITTED'}
                {inspection.finalDecision === 'NG_REPLACE' && '✕ NG / REPLACE'}
                {inspection.finalDecision === 'QC_REVIEW' && '⚠ QC / ENGINEERING REVIEW'}
                {inspection.finalDecision === 'INCOMPLETE' && 'INCOMPLETE'}
              </span>
            </div>
            <span className="text-[11px] font-mono">
              {new Date(inspection.updatedAt).toLocaleDateString()}
            </span>
          </div>

          {/* Details Metadata */}
          <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div>
              <span className="text-[10px] text-slate-400 font-mono block">Engine Model</span>
              <span className="font-bold text-slate-800">{inspection.engineModel}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-mono block">Piston Position</span>
              <span className="font-bold text-slate-800">{inspection.pistonPosition}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-mono block">Part Number</span>
              <span className="font-mono text-slate-800">{inspection.partNumber}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-mono block">Inspector</span>
              <span className="text-slate-800">{inspection.inspectorName}</span>
            </div>
          </div>

          {/* Section A: Dimensional */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between font-bold text-slate-700 uppercase font-mono text-[11px]">
              <span>Section A: Dimensional Results</span>
              <span
                className={
                  inspection.dimensionalResult === 'OK' ? 'text-emerald-700' : 'text-red-700'
                }
              >
                [{inspection.dimensionalResult}]
              </span>
            </div>
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg bg-white overflow-hidden">
              {inspection.dimensionalMeasurements.map((m, idx) => (
                <div key={idx} className="p-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-semibold block text-slate-800">{m.measurementPoint}</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Std: {m.lowerLimit.toFixed(2)} - {m.upperLimit.toFixed(2)} {m.unit}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold font-mono text-slate-900 block">
                      {m.actualValue !== null ? `${m.actualValue.toFixed(2)} ${m.unit}` : '-'}
                    </span>
                    <span
                      className={`text-[10px] font-bold ${
                        m.calculatedResult === 'OK' ? 'text-emerald-600' : 'text-red-600'
                      }`}
                    >
                      {m.calculatedResult}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section B: Visual */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between font-bold text-slate-700 uppercase font-mono text-[11px]">
              <span>Section B: Visual Areas</span>
              <span
                className={
                  inspection.visualResult === 'OK' ? 'text-emerald-700' : 'text-amber-700'
                }
              >
                [{inspection.visualResult}]
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {inspection.visualInspections.map((v, idx) => (
                <div key={idx} className="border border-slate-200 rounded-lg p-2 bg-slate-50 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[11px] text-slate-800 truncate">{v.inspectionArea}</span>
                      <span
                        className={`text-[10px] font-bold px-1.5 rounded ${
                          v.inspectorJudgment === 'OK'
                            ? 'bg-emerald-100 text-emerald-800'
                            : v.inspectorJudgment === 'NG'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {v.inspectorJudgment}
                      </span>
                    </div>
                    {v.inspectorDefectType && (
                      <span className="text-[10px] text-red-700 block mt-0.5">
                        Defect: {v.inspectorDefectType}
                      </span>
                    )}
                  </div>
                  {v.capturedImageDataUrl && (
                    <div className="mt-1.5 aspect-video bg-black rounded overflow-hidden">
                      <img src={v.capturedImageDataUrl} alt={v.inspectionArea} className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Section C: Penetrant */}
          <div className="p-3 bg-purple-50/50 border border-purple-200 rounded-lg space-y-1">
            <div className="flex items-center justify-between font-bold text-[11px] text-purple-900 font-mono">
              <span>Section C: Penetrant Testing (PT)</span>
              <span>[{inspection.penetrantInspection.inspectorJudgment}]</span>
            </div>
            <p className="text-[11px] text-slate-700">
              {inspection.penetrantInspection.inspectorRemarks || 'No crack indications detected.'}
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between gap-2">
          <button
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="flex-1 py-2.5 px-3 bg-white border border-slate-300 text-slate-800 font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 shadow-sm active:bg-slate-50"
          >
            <FileDown className="w-4 h-4 text-blue-700" />
            Download PDF
          </button>

          {inspection.syncStatus !== 'SYNCED' && (
            <button
              onClick={handleRetrySync}
              disabled={isSyncing}
              className="py-2.5 px-3 bg-blue-900 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 shadow active:bg-blue-950"
            >
              <CloudUpload className="w-4 h-4" />
              {isSyncing ? 'Syncing...' : 'Sync to Cloud'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
