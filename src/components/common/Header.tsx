import React from 'react';
import { ArrowLeft, Wifi, WifiOff, CheckCircle2, RefreshCw } from 'lucide-react';
import { InspectionRecord } from '../../types/inspection';

interface HeaderProps {
  inspection?: InspectionRecord | null;
  onBack?: () => void;
  isOnline: boolean;
  saveStatusText?: string;
  onRetrySync?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  inspection,
  onBack,
  isOnline,
  saveStatusText = 'Saved on Device ✓',
  onRetrySync,
}) => {
  if (!inspection) {
    // Normal Top App Bar for Home / History / AI Status
    return (
      <header className="sticky top-0 z-40 bg-[#0F2F57] text-white shadow-md border-b border-[#1E3A8A]">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center font-bold text-white tracking-wider text-sm shadow-inner">
              PV
            </div>
            <div>
              <h1 className="font-bold text-base leading-tight tracking-tight text-white">PistonVision QC</h1>
              <p className="text-[10px] text-blue-200 uppercase tracking-widest font-mono">Piston Reuse Inspection</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isOnline ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                ONLINE
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-950 text-amber-300 border border-amber-800">
                <WifiOff className="w-3 h-3" />
                OFFLINE
              </span>
            )}
          </div>
        </div>
      </header>
    );
  }

  // Active Inspection Sticky Header (Compact & Mobile-optimized)
  const getStepTitle = () => {
    switch (inspection.currentStep) {
      case 'DIMENSIONAL':
        return { stage: 'DIMENSIONAL', step: 'Step 1 of 3' };
      case 'VISUAL':
        return { stage: `VISUAL (${inspection.currentVisualIndex + 1}/7)`, step: 'Step 2 of 3' };
      case 'PENETRANT':
        return { stage: 'PENETRANT', step: 'Step 3 of 3' };
      case 'SUMMARY':
      case 'COMPLETED':
        return { stage: 'SUMMARY', step: 'Final Stage' };
      default:
        return { stage: 'INSPECTION', step: 'Active' };
    }
  };

  const { stage, step } = getStepTitle();

  return (
    <header className="sticky top-0 z-40 bg-[#0F2F57] text-white shadow-md border-b border-[#1E3A8A]">
      <div className="max-w-2xl mx-auto px-3.5 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {onBack && (
              <button
                onClick={onBack}
                className="w-10 h-10 -ml-1 rounded flex items-center justify-center text-slate-200 active:bg-blue-900 transition-colors"
                aria-label="Back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-tight text-white font-mono">
                  {inspection.joNumber || 'NEW JO'}
                </span>
                <span className="text-xs text-blue-300 font-mono">
                  {inspection.pistonPosition || 'Cyl #1'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="font-bold text-xs uppercase tracking-wider text-blue-100">
                  {stage}
                </span>
                <span className="text-[10px] text-blue-300">
                  • {step}
                </span>
              </div>
            </div>
          </div>

          <div className="text-right flex flex-col items-end">
            <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{saveStatusText}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-blue-200 font-mono">
              {isOnline ? (
                <span className="text-emerald-400 font-medium">● Online</span>
              ) : (
                <span className="text-amber-300 font-medium">● Offline mode</span>
              )}
              {inspection.syncStatus === 'PENDING_SYNC' && (
                <button
                  onClick={onRetrySync}
                  className="inline-flex items-center gap-0.5 text-blue-200 underline active:text-white"
                >
                  <RefreshCw className="w-2.5 h-2.5" /> Pending Sync
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
