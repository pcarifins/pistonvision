import React from 'react';
import { ClipboardCheck, History, Cpu } from 'lucide-react';

export type MainTab = 'INSPECT' | 'HISTORY' | 'AI_STATUS';

interface BottomNavProps {
  currentTab: MainTab;
  onChangeTab: (tab: MainTab) => void;
  pendingSyncCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onChangeTab,
  pendingSyncCount = 0,
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] pb-[env(safe-area-inset-bottom,0px)]">
      <div className="max-w-2xl mx-auto grid grid-cols-3 h-14">
        <button
          onClick={() => onChangeTab('INSPECT')}
          className={`flex flex-col items-center justify-center gap-1 transition-colors min-h-[44px] ${
            currentTab === 'INSPECT'
              ? 'text-blue-700 font-semibold'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <ClipboardCheck className={`w-5 h-5 ${currentTab === 'INSPECT' ? 'stroke-[2.4]' : 'stroke-[1.8]'}`} />
          <span className="text-[11px] tracking-wide uppercase">INSPECT</span>
        </button>

        <button
          onClick={() => onChangeTab('HISTORY')}
          className={`flex flex-col items-center justify-center gap-1 transition-colors relative min-h-[44px] ${
            currentTab === 'HISTORY'
              ? 'text-blue-700 font-semibold'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <div className="relative">
            <History className={`w-5 h-5 ${currentTab === 'HISTORY' ? 'stroke-[2.4]' : 'stroke-[1.8]'}`} />
            {pendingSyncCount > 0 && (
              <span className="absolute -top-1 -right-2 px-1 py-0.2 bg-amber-500 text-white rounded-full text-[9px] font-bold">
                {pendingSyncCount}
              </span>
            )}
          </div>
          <span className="text-[11px] tracking-wide uppercase">HISTORY</span>
        </button>

        <button
          onClick={() => onChangeTab('AI_STATUS')}
          className={`flex flex-col items-center justify-center gap-1 transition-colors min-h-[44px] ${
            currentTab === 'AI_STATUS'
              ? 'text-blue-700 font-semibold'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Cpu className={`w-5 h-5 ${currentTab === 'AI_STATUS' ? 'stroke-[2.4]' : 'stroke-[1.8]'}`} />
          <span className="text-[11px] tracking-wide uppercase">AI STATUS</span>
        </button>
      </div>
    </nav>
  );
};
