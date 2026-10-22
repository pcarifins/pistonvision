import React, { useState, useEffect } from 'react';
import { Cpu, Database, CheckCircle2, AlertTriangle, Layers, Settings, ChevronRight, ShieldCheck } from 'lucide-react';
import { AIReadinessReport, AIModelProfile, AIModelStatus } from '../../types/ai';
import { aiService } from '../../services/aiService';
import { dbService } from '../../services/db';

export const AIReadinessScreen: React.FC = () => {
  const [report, setReport] = useState<AIReadinessReport | null>(null);
  const [activeModel, setActiveModel] = useState<AIModelProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showConfigModal, setShowConfigModal] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    const model = await dbService.getActiveModelProfile();
    setActiveModel(model);
    const readiness = await aiService.computeReadinessReport(model);
    setReport(readiness);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateModelStatus = async (newStatus: AIModelStatus) => {
    if (!activeModel) return;
    const updated: AIModelProfile = {
      ...activeModel,
      status: newStatus,
    };
    await dbService.saveActiveModelProfile(updated);
    setActiveModel(updated);
    setShowConfigModal(false);
    loadData();
  };

  if (isLoading || !report || !activeModel) {
    return (
      <div className="w-full max-w-lg mx-auto p-8 text-center text-slate-500 text-xs">
        Loading AI dataset telemetry from IndexedDB...
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col gap-4 pb-24">
      {/* Top Banner */}
      <div className="bg-[#0F2F57] text-white p-4 rounded-xl shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-blue-600/50 flex items-center justify-center text-blue-200">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-sm leading-tight text-white font-mono">
              AI READINESS & DATASET
            </h2>
            <p className="text-[10px] text-blue-200 font-mono">
              Model Pipeline • Shop-Floor Dataset Telemetry
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowConfigModal(true)}
          className="p-2 rounded-lg bg-blue-800/80 hover:bg-blue-800 text-white text-xs flex items-center gap-1 font-semibold"
        >
          <Settings className="w-3.5 h-3.5" />
          Config
        </button>
      </div>

      {/* Active Model Status Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600 font-mono">
            ACTIVE MODEL PROFILE
          </span>
          <span
            className={`px-2.5 py-0.5 rounded text-[11px] font-bold ${
              activeModel.status === 'NO_MODEL'
                ? 'bg-slate-100 text-slate-700 border border-slate-300'
                : activeModel.status === 'EXPERIMENTAL'
                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
            }`}
          >
            {activeModel.status === 'NO_MODEL' && 'DATASET COLLECTION MODE'}
            {activeModel.status === 'EXPERIMENTAL' && 'EXPERIMENTAL AI'}
            {activeModel.status === 'VALIDATED' && 'VALIDATED MODEL'}
            {activeModel.status === 'RETIRED' && 'RETIRED'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-[10px] text-slate-400 font-mono uppercase block">Model Architecture</span>
            <span className="font-bold text-slate-800">{activeModel.modelName}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-mono uppercase block">Version</span>
            <span className="font-bold text-slate-800 font-mono">{activeModel.modelVersion}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-mono uppercase block">Dataset Baseline</span>
            <span className="font-bold text-slate-800 font-mono">{activeModel.datasetVersion}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-mono uppercase block">Approval Status</span>
            <span className="font-semibold text-slate-700">{activeModel.approvalStatus}</span>
          </div>
        </div>

        {activeModel.status !== 'NO_MODEL' && (
          <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-slate-100 text-center">
            <div className="bg-slate-50 p-1.5 rounded">
              <span className="text-[9px] text-slate-400 uppercase block font-mono">Precision</span>
              <span className="font-bold text-xs text-slate-800 font-mono">{activeModel.precision}%</span>
            </div>
            <div className="bg-slate-50 p-1.5 rounded">
              <span className="text-[9px] text-slate-400 uppercase block font-mono">Recall</span>
              <span className="font-bold text-xs text-slate-800 font-mono">{activeModel.recall}%</span>
            </div>
            <div className="bg-slate-50 p-1.5 rounded">
              <span className="text-[9px] text-slate-400 uppercase block font-mono">Crit NG Recall</span>
              <span className="font-bold text-xs text-emerald-700 font-mono">{activeModel.criticalNgRecall}%</span>
            </div>
            <div className="bg-slate-50 p-1.5 rounded">
              <span className="text-[9px] text-slate-400 uppercase block font-mono">FAR</span>
              <span className="font-bold text-xs text-slate-800 font-mono">{activeModel.falseAcceptanceRate}%</span>
            </div>
          </div>
        )}
      </div>

      {/* Dataset Statistics Overview */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] text-slate-400 font-mono uppercase block">Total Images</span>
          <span className="text-xl font-black text-slate-900 font-mono">{report.totalDatasetImages}</span>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] text-slate-400 font-mono uppercase block">Verified Ground Truth</span>
          <span className="text-xl font-black text-emerald-600 font-mono">{report.totalVerified}</span>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] text-slate-400 font-mono uppercase block">OK / NG Ratio</span>
          <span className="text-base font-bold text-slate-800 font-mono">
            {report.overallOkCount} / {report.overallNgCount}
          </span>
        </div>
      </div>

      {/* AI Training Suggestions (Requirement 34 - Real, derived from actual data) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 font-mono">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <span>DATASET TRAINING READINESS SUGGESTIONS</span>
        </div>
        <div className="space-y-1.5 text-xs">
          {report.suggestions.map((sug, i) => (
            <div key={i} className="p-2.5 bg-amber-50/80 border border-amber-200 rounded-lg text-amber-950 flex items-start gap-2">
              <span className="font-bold text-amber-800">•</span>
              <span>{sug}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Area Breakdown Table (Requirement 33) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-700 uppercase tracking-wide flex items-center justify-between">
          <span>BREAKDOWN BY PISTON AREA</span>
          <span className="text-[10px] text-slate-400 font-mono">Ground Truth Samples</span>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {report.areaBreakdown.map((item, idx) => (
            <div key={idx} className="p-3.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">{item.area}</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                    item.readinessStatus === 'READY_FOR_TRAINING'
                      ? 'bg-emerald-100 text-emerald-800'
                      : item.readinessStatus === 'PARTIAL'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {item.readinessStatus === 'READY_FOR_TRAINING' && 'READY'}
                  {item.readinessStatus === 'PARTIAL' && 'COLLECTING'}
                  {item.readinessStatus === 'INSUFFICIENT' && 'LOW DATA'}
                </span>
              </div>

              <div className="flex items-center gap-4 text-[11px] text-slate-500 font-mono">
                <span>Total: <strong>{item.totalImages}</strong></span>
                <span>Verified: <strong>{item.verifiedCount}</strong></span>
                <span>OK: <strong className="text-emerald-700">{item.okCount}</strong></span>
                <span>NG: <strong className="text-red-700">{item.ngCount}</strong></span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Model Configuration Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white rounded-xl p-5 shadow-2xl space-y-4 text-xs text-slate-800">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-sm text-slate-900">Configure AI Inference Mode</h3>
              <button onClick={() => setShowConfigModal(false)} className="text-slate-400 hover:text-slate-700">
                ✕
              </button>
            </div>

            <p className="text-slate-600 text-xs">
              Select the active AI operation mode for shop inspections. Per engineering policy, AI operates strictly advisory.
            </p>

            <div className="space-y-2">
              <button
                onClick={() => handleUpdateModelStatus('NO_MODEL')}
                className={`w-full p-3 rounded-lg border text-left flex items-start gap-2.5 transition-all ${
                  activeModel.status === 'NO_MODEL'
                    ? 'border-blue-600 bg-blue-50/70 text-blue-900 font-semibold'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Database className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Dataset Collection Mode</span>
                  <span className="text-[11px] text-slate-500 font-normal">
                    AI model not active. Zero fake detections. Pure ground-truth collection.
                  </span>
                </div>
              </button>

              <button
                onClick={() => handleUpdateModelStatus('EXPERIMENTAL')}
                className={`w-full p-3 rounded-lg border text-left flex items-start gap-2.5 transition-all ${
                  activeModel.status === 'EXPERIMENTAL'
                    ? 'border-amber-600 bg-amber-50/70 text-amber-900 font-semibold'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Cpu className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Experimental AI Mode</span>
                  <span className="text-[11px] text-slate-500 font-normal">
                    YOLO defect advisory enabled. Inspector confirmation mandatory.
                  </span>
                </div>
              </button>

              <button
                onClick={() => handleUpdateModelStatus('VALIDATED')}
                className={`w-full p-3 rounded-lg border text-left flex items-start gap-2.5 transition-all ${
                  activeModel.status === 'VALIDATED'
                    ? 'border-emerald-600 bg-emerald-50/70 text-emerald-900 font-semibold'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Validated Model</span>
                  <span className="text-[11px] text-slate-500 font-normal">
                    Fully audited model metrics with signed engineering approval.
                  </span>
                </div>
              </button>
            </div>

            <button
              onClick={() => setShowConfigModal(false)}
              className="w-full py-2.5 bg-slate-100 text-slate-800 font-semibold rounded-lg text-xs hover:bg-slate-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
