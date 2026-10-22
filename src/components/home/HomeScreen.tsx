import React, { useState } from 'react';
import { ArrowRight, Search, Play, RefreshCw, ChevronDown, ChevronUp, Clock, PlusCircle } from 'lucide-react';
import { InspectionRecord } from '../../types/inspection';
import { SUPPORTED_ENGINES } from '../../data/criteriaMaster';
import { PWAInstallButton } from '../common/PWAInstallButton';

interface HomeScreenProps {
  onStartNewInspection: (data: {
    joNumber: string;
    engineModel: string;
    partNumber: string;
    pistonPosition: string;
    inspectorName: string;
  }) => void;
  onResumeInspection: (inspection: InspectionRecord) => void;
  onViewInspectionDetails: (inspection: InspectionRecord) => void;
  unfinishedInspection: InspectionRecord | null;
  recentInspections: InspectionRecord[];
  isOnline: boolean;
  pendingSyncCount: number;
  onRetrySync: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onStartNewInspection,
  onResumeInspection,
  onViewInspectionDetails,
  unfinishedInspection,
  recentInspections,
  isOnline,
  pendingSyncCount,
  onRetrySync,
}) => {
  const [joNumber, setJoNumber] = useState('');
  const [engineModel, setEngineModel] = useState('SAA6D140E-5');
  const [partNumber, setPartNumber] = useState('6217-31-2110');
  const [pistonPosition, setPistonPosition] = useState('Cylinder #1');
  const [inspectorName, setInspectorName] = useState('QC Inspector');
  const [showOptionalFields, setShowOptionalFields] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');

  const handleEngineChange = (model: string) => {
    setEngineModel(model);
    const found = SUPPORTED_ENGINES.find((e) => e.model === model);
    if (found) {
      setPartNumber(found.defaultPartNumber);
    }
  };

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanJO = joNumber.trim().toUpperCase();
    if (!cleanJO) return;

    onStartNewInspection({
      joNumber: cleanJO,
      engineModel,
      partNumber: partNumber.trim() || '6217-31-2110',
      pistonPosition: pistonPosition.trim() || 'Cylinder #1',
      inspectorName: inspectorName.trim() || 'QC Inspector',
    });
  };

  const filteredRecents = recentInspections.filter((insp) =>
    insp.joNumber.toUpperCase().includes(searchQuery.trim().toUpperCase())
  );

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col gap-4 pb-24">
      {/* PWA Install Banner */}
      <PWAInstallButton />

      {/* Connectivity & Pending Sync Badge Bar */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5 text-xs font-mono">
          {isOnline ? (
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              ONLINE
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 font-semibold text-amber-700">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              OFFLINE (Local Mode)
            </span>
          )}
        </div>

        {pendingSyncCount > 0 && (
          <button
            onClick={onRetrySync}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-amber-100 text-amber-900 text-xs font-semibold hover:bg-amber-200 transition-colors"
          >
            <RefreshCw className="w-3 h-3 text-amber-700" />
            <span>{pendingSyncCount} Pending Sync</span>
          </button>
        )}
      </div>

      {/* Unfinished Inspection Resume Banner (Requirement 30) */}
      {unfinishedInspection && (
        <div className="p-4 bg-blue-900 text-white rounded-xl shadow-md space-y-2 border border-blue-800">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-widest text-blue-300 font-mono">
              UNFINISHED INSPECTION
            </span>
            <span className="text-[10px] text-blue-200 font-mono">
              {unfinishedInspection.joNumber}
            </span>
          </div>

          <div className="text-xs">
            <div className="font-semibold text-white">
              {unfinishedInspection.currentStep === 'DIMENSIONAL' && 'Progress: Dimensional Measurements'}
              {unfinishedInspection.currentStep === 'VISUAL' &&
                `Progress: Visual ${unfinishedInspection.currentVisualIndex + 1}/7`}
              {unfinishedInspection.currentStep === 'PENETRANT' && 'Progress: Penetrant Inspection'}
              {unfinishedInspection.currentStep === 'SUMMARY' && 'Progress: Final Summary'}
            </div>
            <p className="text-[11px] text-blue-200 mt-0.5">
              Inspection was safely preserved on device. Resume where you left off.
            </p>
          </div>

          <button
            onClick={() => onResumeInspection(unfinishedInspection)}
            className="w-full py-2.5 px-3 bg-emerald-500 active:bg-emerald-600 text-slate-950 font-bold text-xs rounded-lg uppercase tracking-wider flex items-center justify-center gap-1.5 shadow"
          >
            <Play className="w-3.5 h-3.5 fill-slate-950" />
            CONTINUE INSPECTION
          </button>
        </div>
      )}

      {/* Main Start Inspection Card (Requirement 4) */}
      <form onSubmit={handleStart} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
            NEW INSPECTION
          </span>
          <span className="text-[11px] text-slate-400 font-mono">Komatsu Reman</span>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-800 block mb-1.5 uppercase tracking-wide">
            JO NUMBER
          </label>
          <input
            type="text"
            required
            value={joNumber}
            onChange={(e) => setJoNumber(e.target.value)}
            placeholder="e.g. 2210008493"
            autoFocus
            className="w-full h-13 px-4 bg-slate-50 border-2 border-slate-300 focus:border-blue-600 focus:bg-white rounded-xl text-lg font-bold font-mono text-slate-900 outline-none transition-all placeholder:text-slate-400"
          />
        </div>

        {/* Collapsible Optional Identification Fields */}
        <div>
          <button
            type="button"
            onClick={() => setShowOptionalFields(!showOptionalFields)}
            className="text-xs font-semibold text-blue-700 flex items-center gap-1 hover:underline"
          >
            {showOptionalFields ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {showOptionalFields ? 'Hide Identification Details' : 'Engine Model & Details (Optional)'}
          </button>

          {showOptionalFields && (
            <div className="pt-3 space-y-3 animate-fadeIn text-xs text-slate-700">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Engine Model</label>
                <select
                  value={engineModel}
                  onChange={(e) => handleEngineChange(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-900 outline-none"
                >
                  {SUPPORTED_ENGINES.map((e) => (
                    <option key={e.model} value={e.model}>
                      {e.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Part Number</label>
                  <input
                    type="text"
                    value={partNumber}
                    onChange={(e) => setPartNumber(e.target.value)}
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Cylinder Position</label>
                  <input
                    type="text"
                    value={pistonPosition}
                    onChange={(e) => setPistonPosition(e.target.value)}
                    placeholder="e.g. Cylinder #1"
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Inspector Name</label>
                <input
                  type="text"
                  value={inspectorName}
                  onChange={(e) => setInspectorName(e.target.value)}
                  placeholder="e.g. S. Tanaka (QC-04)"
                  className="w-full h-9 px-3 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900"
                />
              </div>
            </div>
          )}
        </div>

        {/* Primary Action Button */}
        <button
          type="submit"
          disabled={!joNumber.trim()}
          className="w-full py-3.5 px-4 bg-blue-900 active:bg-blue-950 text-white font-bold text-sm rounded-xl uppercase tracking-wider flex items-center justify-center gap-2 shadow-md disabled:opacity-40 min-h-[48px]"
        >
          <span>START INSPECTION</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      {/* Recent Inspections (Requirement 4) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600 font-mono">
            RECENT INSPECTIONS
          </span>
          <span className="text-[11px] text-slate-400 font-mono">
            {recentInspections.length} recorded
          </span>
        </div>

        {/* JO Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search JO..."
            className="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white focus:border-blue-500"
          />
        </div>

        {/* Simple list showing only JO, Date, Result, Sync Status */}
        <div className="divide-y divide-slate-100">
          {filteredRecents.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400">
              No inspections found.
            </div>
          ) : (
            filteredRecents.slice(0, 5).map((item) => (
              <div
                key={item.inspectionId}
                onClick={() => onViewInspectionDetails(item)}
                className="py-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-50 active:bg-slate-100 rounded px-1 transition-colors"
              >
                <div>
                  <div className="font-bold text-xs text-slate-900 font-mono">
                    {item.joNumber}
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <span>{new Date(item.updatedAt).toLocaleDateString()}</span>
                    <span>• {item.engineModel}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Result Badge */}
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      item.finalDecision === 'REUSE'
                        ? 'bg-emerald-100 text-emerald-800'
                        : item.finalDecision === 'NG_REPLACE'
                        ? 'bg-red-100 text-red-800'
                        : item.finalDecision === 'QC_REVIEW'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {item.finalDecision === 'REUSE' && 'REUSE'}
                    {item.finalDecision === 'NG_REPLACE' && 'NG'}
                    {item.finalDecision === 'QC_REVIEW' && 'REVIEW'}
                    {item.finalDecision === 'INCOMPLETE' && 'PENDING'}
                  </span>

                  {/* Sync Status Indicator */}
                  <span
                    className={`text-[10px] font-mono ${
                      item.syncStatus === 'SYNCED'
                        ? 'text-emerald-600'
                        : item.syncStatus === 'SYNCING'
                        ? 'text-blue-600'
                        : 'text-amber-600'
                    }`}
                  >
                    {item.syncStatus === 'SYNCED' ? 'Synced ✓' : 'Local'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
