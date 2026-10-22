import React, { useState, useEffect } from 'react';
import { Header } from './components/common/Header';
import { BottomNav, MainTab } from './components/common/BottomNav';
import { HomeScreen } from './components/home/HomeScreen';
import { HistoryScreen } from './components/history/HistoryScreen';
import { AIReadinessScreen } from './components/ai/AIReadinessScreen';
import { DimensionalStep } from './components/inspection/DimensionalStep';
import { VisualStep } from './components/inspection/VisualStep';
import { PenetrantStep } from './components/inspection/PenetrantStep';
import { SummaryStep } from './components/inspection/SummaryStep';
import { InspectionDetailModal } from './components/history/InspectionDetailModal';
import { dbService } from './services/db';
import { syncService } from './services/syncService';
import { InspectionRecord } from './types/inspection';
import {
  getDimensionalCriteriaForModel,
  getVisualCriteriaForModel,
  getPenetrantCriteriaForModel,
  OFFICIAL_MANUAL_INFO,
} from './data/criteriaMaster';

export default function App() {
  const [currentTab, setCurrentTab] = useState<MainTab>('INSPECT');
  const [activeInspection, setActiveInspection] = useState<InspectionRecord | null>(null);
  const [unfinishedInspection, setUnfinishedInspection] = useState<InspectionRecord | null>(null);
  const [inspectionsList, setInspectionsList] = useState<InspectionRecord[]>([]);
  const [selectedHistoryInspection, setSelectedHistoryInspection] = useState<InspectionRecord | null>(null);

  const [isOnline, setIsOnline] = useState<boolean>(syncService.isOnline());
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [saveStatusText, setSaveStatusText] = useState<string>('Saved on Device ✓');

  // Load database state & subscribe to connectivity/sync changes
  const refreshDatabaseState = async () => {
    await dbService.seedIfEmpty();
    const all = await dbService.getAllInspections();
    setInspectionsList(all);

    const unfinished = await dbService.getUnfinishedInspection();
    setUnfinishedInspection(unfinished);

    const pending = all.filter(
      (i) => i.syncStatus === 'PENDING_SYNC' || i.syncStatus === 'SAVED_LOCALLY' || i.syncStatus === 'SYNC_ERROR'
    ).length;
    setPendingSyncCount(pending);
  };

  useEffect(() => {
    refreshDatabaseState();

    const unsubscribe = syncService.subscribe((status) => {
      setIsOnline(status.isOnline);
      setPendingSyncCount(status.pendingCount);
    });

    return () => unsubscribe();
  }, []);

  // Handle Starting a New Inspection
  const handleStartNewInspection = async (initData: {
    joNumber: string;
    engineModel: string;
    partNumber: string;
    pistonPosition: string;
    inspectorName: string;
  }) => {
    const dimCriteria = getDimensionalCriteriaForModel(initData.engineModel, initData.partNumber);
    const visCriteria = getVisualCriteriaForModel(initData.engineModel);
    const ptCriteria = getPenetrantCriteriaForModel(initData.engineModel);

    const newInspectionId = `INSP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const newRecord: InspectionRecord = {
      inspectionId: newInspectionId,
      joNumber: initData.joNumber,
      engineModel: initData.engineModel,
      partNumber: initData.partNumber,
      pistonPosition: initData.pistonPosition,
      inspectorName: initData.inspectorName,
      manualNumber: OFFICIAL_MANUAL_INFO.manualNumber,
      criteriaRevision: OFFICIAL_MANUAL_INFO.revision,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      currentStep: 'DIMENSIONAL',
      currentVisualIndex: 0,

      // Initialize dimensional measurements from Criteria Master
      dimensionalMeasurements: dimCriteria.map((c) => ({
        measurementPoint: c.measurementPoint,
        criteriaId: c.criteriaId,
        actualValue: null,
        unit: c.unit,
        nominalValue: c.nominalValue,
        lowerLimit: c.lowerLimit,
        upperLimit: c.upperLimit,
        ruleType: c.ruleType,
        calculatedResult: 'PENDING',
        deviation: null,
        manualRevision: c.revision,
        measuredAt: new Date().toISOString(),
        correctionHistory: [],
        isConfirmed: false,
      })),

      // Initialize visual areas from Criteria Master
      visualInspections: visCriteria.map((v) => ({
        areaCode: v.areaCode,
        inspectionArea: v.inspectionArea,
        criteriaId: v.criteriaId,
        manualRevision: v.revision,
        inspectorJudgment: 'PENDING',
        isCompleted: false,
      })),

      // Initialize penetrant record
      penetrantInspection: {
        criteriaId: ptCriteria.criteriaId,
        manualRevision: ptCriteria.revision,
        inspectorJudgment: 'PENDING',
        isCompleted: false,
      },

      dimensionalResult: 'PENDING',
      visualResult: 'PENDING',
      penetrantResult: 'PENDING',
      finalDecision: 'INCOMPLETE',

      syncStatus: isOnline ? 'PENDING_SYNC' : 'SAVED_LOCALLY',
      syncAttempts: 0,
      pdfGenerated: false,
    };

    // Save to IndexedDB immediately
    await dbService.saveInspection(newRecord);
    setActiveInspection(newRecord);
    refreshDatabaseState();
  };

  // Resume an Unfinished Inspection
  const handleResumeInspection = (inspection: InspectionRecord) => {
    setActiveInspection(inspection);
  };

  // Auto-Save after any meaningful operator action
  const handleUpdateActiveInspection = async (updated: InspectionRecord) => {
    setSaveStatusText('Saving...');
    setActiveInspection(updated);
    await dbService.saveInspection(updated);
    setSaveStatusText('Saved on Device ✓');
    refreshDatabaseState();
  };

  // Navigation handlers during inspection
  const handleBackFromInspection = () => {
    if (window.confirm('Pause inspection? All progress has been safely saved on your device.')) {
      setActiveInspection(null);
      refreshDatabaseState();
    }
  };

  const handleFinishInspection = async () => {
    setActiveInspection(null);
    setCurrentTab('HISTORY');
    refreshDatabaseState();
  };

  const handleRetrySync = async () => {
    await syncService.syncAllPending();
    refreshDatabaseState();
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Sticky App / Inspection Header */}
      <Header
        inspection={activeInspection}
        onBack={activeInspection ? handleBackFromInspection : undefined}
        isOnline={isOnline}
        saveStatusText={saveStatusText}
        onRetrySync={handleRetrySync}
      />

      {/* Main Container */}
      <main className="flex-1 w-full max-w-2xl mx-auto px-3.5 pt-3">
        {activeInspection ? (
          // ACTIVE INSPECTION FLOW (Sequential: 1 Dimensional -> 2 Visual -> 3 Penetrant -> 4 Summary)
          <div>
            {activeInspection.currentStep === 'DIMENSIONAL' && (
              <DimensionalStep
                inspection={activeInspection}
                onUpdateInspection={handleUpdateActiveInspection}
                onNext={() => {
                  handleUpdateActiveInspection({
                    ...activeInspection,
                    currentStep: 'VISUAL',
                  });
                }}
              />
            )}

            {activeInspection.currentStep === 'VISUAL' && (
              <VisualStep
                inspection={activeInspection}
                onUpdateInspection={handleUpdateActiveInspection}
                onNext={() => {
                  handleUpdateActiveInspection({
                    ...activeInspection,
                    currentStep: 'PENETRANT',
                  });
                }}
                onPrev={() => {
                  handleUpdateActiveInspection({
                    ...activeInspection,
                    currentStep: 'DIMENSIONAL',
                  });
                }}
              />
            )}

            {activeInspection.currentStep === 'PENETRANT' && (
              <PenetrantStep
                inspection={activeInspection}
                onUpdateInspection={handleUpdateActiveInspection}
                onNext={() => {
                  handleUpdateActiveInspection({
                    ...activeInspection,
                    currentStep: 'SUMMARY',
                  });
                }}
                onPrev={() => {
                  handleUpdateActiveInspection({
                    ...activeInspection,
                    currentStep: 'VISUAL',
                  });
                }}
              />
            )}

            {(activeInspection.currentStep === 'SUMMARY' || activeInspection.currentStep === 'COMPLETED') && (
              <SummaryStep
                inspection={activeInspection}
                onUpdateInspection={handleUpdateActiveInspection}
                onFinishInspection={handleFinishInspection}
                onBackToStep={(step) => {
                  handleUpdateActiveInspection({
                    ...activeInspection,
                    currentStep: step,
                  });
                }}
              />
            )}
          </div>
        ) : (
          // GLOBAL TAB VIEWS
          <div>
            {currentTab === 'INSPECT' && (
              <HomeScreen
                onStartNewInspection={handleStartNewInspection}
                onResumeInspection={handleResumeInspection}
                onViewInspectionDetails={(insp) => setSelectedHistoryInspection(insp)}
                unfinishedInspection={unfinishedInspection}
                recentInspections={inspectionsList}
                isOnline={isOnline}
                pendingSyncCount={pendingSyncCount}
                onRetrySync={handleRetrySync}
              />
            )}

            {currentTab === 'HISTORY' && (
              <HistoryScreen
                inspections={inspectionsList}
                onSelectInspection={(insp) => setSelectedHistoryInspection(insp)}
                onRefresh={refreshDatabaseState}
                isOnline={isOnline}
              />
            )}

            {currentTab === 'AI_STATUS' && <AIReadinessScreen />}
          </div>
        )}
      </main>

      {/* Detail Modal when clicked in History or Recents */}
      {selectedHistoryInspection && (
        <InspectionDetailModal
          inspection={selectedHistoryInspection}
          onClose={() => setSelectedHistoryInspection(null)}
          onRefresh={refreshDatabaseState}
        />
      )}

      {/* Global Bottom Navigation (Visible when not actively inside camera/measurement tasks or always accessible) */}
      {!activeInspection && (
        <BottomNav
          currentTab={currentTab}
          onChangeTab={(tab) => setCurrentTab(tab)}
          pendingSyncCount={pendingSyncCount}
        />
      )}
    </div>
  );
}
