import React, { useState } from 'react';
import { Search, FileText, FileDown, RefreshCw, Eye, CheckCircle2, XCircle, AlertTriangle, CloudCheck } from 'lucide-react';
import { InspectionRecord } from '../../types/inspection';
import { generatePistonQCPdf } from '../../services/pdfService';
import { syncService } from '../../services/syncService';

interface HistoryScreenProps {
  inspections: InspectionRecord[];
  onSelectInspection: (inspection: InspectionRecord) => void;
  onRefresh: () => void;
  isOnline: boolean;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({
  inspections,
  onSelectInspection,
  onRefresh,
  isOnline,
}) => {
  const [search, setSearch] = useState('');
  const [filterResult, setFilterResult] = useState<string>('ALL');

  const filtered = inspections.filter((insp) => {
    const matchesSearch =
      insp.joNumber.toUpperCase().includes(search.trim().toUpperCase()) ||
      insp.inspectorName.toUpperCase().includes(search.trim().toUpperCase()) ||
      insp.engineModel.toUpperCase().includes(search.trim().toUpperCase());

    const matchesFilter =
      filterResult === 'ALL' ||
      (filterResult === 'REUSE' && insp.finalDecision === 'REUSE') ||
      (filterResult === 'NG' && insp.finalDecision === 'NG_REPLACE') ||
      (filterResult === 'REVIEW' && insp.finalDecision === 'QC_REVIEW');

    return matchesSearch && matchesFilter;
  });

  const handleDownloadPdf = (e: React.MouseEvent, insp: InspectionRecord) => {
    e.stopPropagation();
    try {
      const doc = generatePistonQCPdf(insp);
      doc.save(`Piston_QC_${insp.joNumber}.pdf`);
    } catch (err) {
      console.error('PDF error:', err);
      alert('Error generating PDF.');
    }
  };

  const handleSyncAll = async () => {
    await syncService.syncAllPending();
    onRefresh();
  };

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col gap-4 pb-24">
      {/* Top Header Controls */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-900 font-mono">
          INSPECTION HISTORY ({inspections.length})
        </h2>
        <button
          onClick={handleSyncAll}
          className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-900 rounded-lg text-xs font-semibold hover:bg-blue-100"
        >
          <RefreshCw className="w-3.5 h-3.5 text-blue-700" />
          Sync All
        </button>
      </div>

      {/* Search & Filter */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search JO, Engine Model, Inspector..."
            className="w-full h-11 pl-9 pr-3 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 shadow-sm"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
          {['ALL', 'REUSE', 'NG', 'REVIEW'].map((f) => (
            <button
              key={f}
              onClick={() => setFilterResult(f)}
              className={`px-3 py-1.5 rounded-lg font-bold text-[11px] whitespace-nowrap transition-colors ${
                filterResult === f
                  ? 'bg-blue-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {f === 'ALL' && 'All Records'}
              {f === 'REUSE' && '✓ Reuse Only'}
              {f === 'NG' && '✕ NG Only'}
              {f === 'REVIEW' && '⚠ Review Only'}
            </button>
          ))}
        </div>
      </div>

      {/* History List */}
      <div className="space-y-2.5">
        {filtered.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-400 text-xs">
            No inspection records match your search criteria.
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.inspectionId}
              onClick={() => onSelectInspection(item)}
              className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-blue-300 transition-all cursor-pointer flex flex-col gap-2"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm text-slate-900 font-mono">
                    {item.joNumber}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                    {item.engineModel} • {item.pistonPosition}
                  </div>
                </div>

                {/* Final Decision Badge */}
                <span
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                    item.finalDecision === 'REUSE'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : item.finalDecision === 'NG_REPLACE'
                      ? 'bg-red-100 text-red-800 border border-red-300'
                      : item.finalDecision === 'QC_REVIEW'
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {item.finalDecision === 'REUSE' && '✓ REUSE'}
                  {item.finalDecision === 'NG_REPLACE' && '✕ NG'}
                  {item.finalDecision === 'QC_REVIEW' && '⚠ REVIEW'}
                  {item.finalDecision === 'INCOMPLETE' && 'PENDING'}
                </span>
              </div>

              {/* Sub-results row */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                <div className="flex items-center gap-2">
                  <span>DIM: <strong>{item.dimensionalResult}</strong></span>
                  <span>•</span>
                  <span>VIS: <strong>{item.visualResult}</strong></span>
                  <span>•</span>
                  <span>PT: <strong>{item.penetrantResult}</strong></span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Sync status */}
                  <span
                    className={`font-mono text-[10px] ${
                      item.syncStatus === 'SYNCED'
                        ? 'text-emerald-600'
                        : item.syncStatus === 'SYNCING'
                        ? 'text-blue-600'
                        : 'text-amber-600'
                    }`}
                  >
                    {item.syncStatus === 'SYNCED' ? 'Cloud Synced ✓' : 'Local Only'}
                  </span>

                  {/* PDF Download Button */}
                  <button
                    onClick={(e) => handleDownloadPdf(e, item)}
                    title="Download PDF"
                    className="p-1 rounded hover:bg-slate-100 text-slate-600 active:text-blue-700"
                  >
                    <FileDown className="w-4 h-4 text-blue-700" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
