import { InspectionRecord } from '../types/inspection';
import { DatasetItem, AIModelProfile } from '../types/ai';

const DB_NAME = 'piston_vision_qc_db';
const DB_VERSION = 1;

export const DEFAULT_MODEL_PROFILE: AIModelProfile = {
  modelId: 'YOLO-REMAN-PISTON-01',
  modelName: 'YOLOv11-Komatsu-Piston-Visual',
  modelVersion: 'v0.9.2-exp',
  status: 'NO_MODEL', // Default to DATASET COLLECTION MODE per requirement 18
  datasetVersion: 'DS-2026.04-KMT',
  trainingDate: '2026-04-10',
  validationDate: '2026-04-12',
  precision: 94.6,
  recall: 96.2,
  criticalNgRecall: 99.4,
  falseAcceptanceRate: 0.3,
  approvalStatus: 'DATASET_ONLY',
  approvedBy: 'Pending Field QA Validation',
};

class InspectionDatabase {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = request.result;

        // Store 1: Inspections
        if (!db.objectStoreNames.contains('inspections')) {
          const inspStore = db.createObjectStore('inspections', { keyPath: 'inspectionId' });
          inspStore.createIndex('joNumber', 'joNumber', { unique: false });
          inspStore.createIndex('updatedAt', 'updatedAt', { unique: false });
          inspStore.createIndex('syncStatus', 'syncStatus', { unique: false });
          inspStore.createIndex('finalDecision', 'finalDecision', { unique: false });
        }

        // Store 2: High-resolution images (blobs/dataUrls)
        if (!db.objectStoreNames.contains('images')) {
          const imgStore = db.createObjectStore('images', { keyPath: 'imageId' });
          imgStore.createIndex('inspectionId', 'inspectionId', { unique: false });
        }

        // Store 3: Dataset items (ground truth ready for YOLO training)
        if (!db.objectStoreNames.contains('dataset')) {
          const dsStore = db.createObjectStore('dataset', { keyPath: 'imageId' });
          dsStore.createIndex('inspectionArea', 'inspectionArea', { unique: false });
          dsStore.createIndex('verificationStatus', 'verificationStatus', { unique: false });
          dsStore.createIndex('defectClass', 'defectClass', { unique: false });
        }

        // Store 4: AI Model Config & Profiles
        if (!db.objectStoreNames.contains('model_config')) {
          db.createObjectStore('model_config', { keyPath: 'configKey' });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('IndexedDB open error:', request.error);
        reject(request.error);
      };
    });

    return this.dbPromise;
  }

  // --- Inspection Operations ---

  async saveInspection(inspection: InspectionRecord): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('inspections', 'readwrite');
      const store = tx.objectStore('inspections');
      inspection.updatedAt = new Date().toISOString();
      const req = store.put(inspection);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async getInspection(inspectionId: string): Promise<InspectionRecord | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('inspections', 'readonly');
      const store = tx.objectStore('inspections');
      const req = store.get(inspectionId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async getAllInspections(): Promise<InspectionRecord[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('inspections', 'readonly');
      const store = tx.objectStore('inspections');
      const req = store.getAll();
      req.onsuccess = () => {
        const results: InspectionRecord[] = req.result || [];
        // Sort descending by updatedAt
        results.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        resolve(results);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async searchInspectionsByJO(query: string): Promise<InspectionRecord[]> {
    const all = await this.getAllInspections();
    const cleanQ = query.trim().toUpperCase();
    if (!cleanQ) return all;
    return all.filter(
      (insp) =>
        insp.joNumber.toUpperCase().includes(cleanQ) ||
        insp.engineModel.toUpperCase().includes(cleanQ) ||
        insp.partNumber.toUpperCase().includes(cleanQ) ||
        insp.inspectorName.toUpperCase().includes(cleanQ)
    );
  }

  async getUnfinishedInspection(): Promise<InspectionRecord | null> {
    const all = await this.getAllInspections();
    // Find the most recent active inspection that is not COMPLETED or finalized
    const unfinished = all.find(
      (insp) => insp.currentStep !== 'COMPLETED' && insp.finalDecision === 'INCOMPLETE'
    );
    return unfinished || null;
  }

  // --- Image Storage ---

  async saveImage(imageId: string, inspectionId: string, dataUrl: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('images', 'readwrite');
      const store = tx.objectStore('images');
      const req = store.put({
        imageId,
        inspectionId,
        dataUrl,
        savedAt: new Date().toISOString(),
      });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async getImage(imageId: string): Promise<string | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('images', 'readonly');
      const store = tx.objectStore('images');
      const req = store.get(imageId);
      req.onsuccess = () => resolve(req.result ? req.result.dataUrl : null);
      req.onerror = () => reject(req.error);
    });
  }

  // --- Dataset Storage ---

  async saveDatasetItem(item: DatasetItem): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('dataset', 'readwrite');
      const store = tx.objectStore('dataset');
      const req = store.put(item);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async getAllDatasetItems(): Promise<DatasetItem[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('dataset', 'readonly');
      const store = tx.objectStore('dataset');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  // --- AI Model Config ---

  async getActiveModelProfile(): Promise<AIModelProfile> {
    const db = await this.getDB();
    return new Promise((resolve) => {
      const tx = db.transaction('model_config', 'readonly');
      const store = tx.objectStore('model_config');
      const req = store.get('active_model');
      req.onsuccess = () => {
        if (req.result && req.result.profile) {
          resolve(req.result.profile);
        } else {
          resolve(DEFAULT_MODEL_PROFILE);
        }
      };
      req.onerror = () => resolve(DEFAULT_MODEL_PROFILE);
    });
  }

  async saveActiveModelProfile(profile: AIModelProfile): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('model_config', 'readwrite');
      const store = tx.objectStore('model_config');
      const req = store.put({ configKey: 'active_model', profile });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // --- Initial Seed with Sample Inspections for quick QC validation if empty ---
  async seedIfEmpty(): Promise<void> {
    const all = await this.getAllInspections();
    if (all.length > 0) return;

    // Seed 2 realistic historical inspection records for shop-floor demonstration
    const sample1: InspectionRecord = {
      inspectionId: 'INSP-202610-001',
      joNumber: 'JO-2210008491',
      engineModel: 'SAA6D140E-5',
      partNumber: '6217-31-2110',
      pistonPosition: 'Cylinder #1',
      inspectorName: 'S. Tanaka (QC-04)',
      manualNumber: 'SEBM023408-04',
      criteriaRevision: 'Rev 4 (Nov 2023)',
      createdAt: '2026-10-19T08:30:00.000Z',
      updatedAt: '2026-10-19T09:12:00.000Z',
      currentStep: 'COMPLETED',
      currentVisualIndex: 6,
      dimensionalMeasurements: [
        {
          measurementPoint: 'Top Ring Groove Width (#1)',
          criteriaId: 'CRIT-DIM-140-01',
          actualValue: 4.18,
          unit: 'mm',
          nominalValue: 4.18,
          lowerLimit: 4.10,
          upperLimit: 4.25,
          ruleType: 'RANGE',
          calculatedResult: 'OK',
          deviation: 0.0,
          manualRevision: 'Rev 4',
          measuredAt: '2026-10-19T08:34:00.000Z',
          correctionHistory: [],
          isConfirmed: true,
        },
        {
          measurementPoint: 'Second Ring Groove Width (#2)',
          criteriaId: 'CRIT-DIM-140-02',
          actualValue: 3.06,
          unit: 'mm',
          nominalValue: 3.05,
          lowerLimit: 3.00,
          upperLimit: 3.12,
          ruleType: 'RANGE',
          calculatedResult: 'OK',
          deviation: 0.01,
          manualRevision: 'Rev 4',
          measuredAt: '2026-10-19T08:36:00.000Z',
          correctionHistory: [],
          isConfirmed: true,
        },
        {
          measurementPoint: 'Oil Ring Groove Width (#3)',
          criteriaId: 'CRIT-DIM-140-03',
          actualValue: 4.05,
          unit: 'mm',
          nominalValue: 4.04,
          lowerLimit: 4.00,
          upperLimit: 4.10,
          ruleType: 'RANGE',
          calculatedResult: 'OK',
          deviation: 0.01,
          manualRevision: 'Rev 4',
          measuredAt: '2026-10-19T08:37:00.000Z',
          correctionHistory: [],
          isConfirmed: true,
        },
        {
          measurementPoint: 'Piston Skirt Outside Diameter (Thrust/Anti-thrust)',
          criteriaId: 'CRIT-DIM-140-04',
          actualValue: 139.82,
          unit: 'mm',
          nominalValue: 139.84,
          lowerLimit: 139.75,
          upperLimit: 139.92,
          ruleType: 'RANGE',
          calculatedResult: 'OK',
          deviation: -0.02,
          manualRevision: 'Rev 4',
          measuredAt: '2026-10-19T08:40:00.000Z',
          correctionHistory: [],
          isConfirmed: true,
        },
        {
          measurementPoint: 'Piston Pin Bore Inside Diameter',
          criteriaId: 'CRIT-DIM-140-05',
          actualValue: 50.02,
          unit: 'mm',
          nominalValue: 50.02,
          lowerLimit: 49.99,
          upperLimit: 50.05,
          ruleType: 'RANGE',
          calculatedResult: 'OK',
          deviation: 0.0,
          manualRevision: 'Rev 4',
          measuredAt: '2026-10-19T08:42:00.000Z',
          correctionHistory: [],
          isConfirmed: true,
        },
      ],
      visualInspections: [
        {
          areaCode: 'CROWN',
          inspectionArea: 'Crown / Top Surface',
          criteriaId: 'CRIT-VIS-01',
          manualRevision: 'Rev 4',
          inspectorJudgment: 'OK',
          isCompleted: true,
          inspectedAt: '2026-10-19T08:48:00.000Z',
        },
        {
          areaCode: 'BOWL_RIM',
          inspectionArea: 'Combustion Bowl Rim',
          criteriaId: 'CRIT-VIS-02',
          manualRevision: 'Rev 4',
          inspectorJudgment: 'OK',
          isCompleted: true,
          inspectedAt: '2026-10-19T08:51:00.000Z',
        },
        {
          areaCode: 'RING_GROOVE',
          inspectionArea: 'Ring Groove Lands',
          criteriaId: 'CRIT-VIS-03',
          manualRevision: 'Rev 4',
          inspectorJudgment: 'OK',
          isCompleted: true,
          inspectedAt: '2026-10-19T08:54:00.000Z',
        },
        {
          areaCode: 'SKIRT',
          inspectionArea: 'Skirt (Thrust & Anti-thrust)',
          criteriaId: 'CRIT-VIS-04',
          manualRevision: 'Rev 4',
          inspectorJudgment: 'OK',
          isCompleted: true,
          inspectedAt: '2026-10-19T08:57:00.000Z',
        },
        {
          areaCode: 'PIN_BOSS',
          inspectionArea: 'Pin Boss / Pin Bore',
          criteriaId: 'CRIT-VIS-05',
          manualRevision: 'Rev 4',
          inspectorJudgment: 'OK',
          isCompleted: true,
          inspectedAt: '2026-10-19T09:00:00.000Z',
        },
        {
          areaCode: 'BACK_FACE',
          inspectionArea: 'Back Face (Under-crown)',
          criteriaId: 'CRIT-VIS-06',
          manualRevision: 'Rev 4',
          inspectorJudgment: 'OK',
          isCompleted: true,
          inspectedAt: '2026-10-19T09:02:00.000Z',
        },
        {
          areaCode: 'COOLING_GALLERY',
          inspectionArea: 'Cooling Gallery Entrance',
          criteriaId: 'CRIT-VIS-07',
          manualRevision: 'Rev 4',
          inspectorJudgment: 'OK',
          isCompleted: true,
          inspectedAt: '2026-10-19T09:05:00.000Z',
        },
      ],
      penetrantInspection: {
        criteriaId: 'CRIT-PT-01',
        manualRevision: 'Rev 4',
        inspectorJudgment: 'OK',
        isCompleted: true,
        inspectedAt: '2026-10-19T09:10:00.000Z',
      },
      dimensionalResult: 'OK',
      visualResult: 'OK',
      penetrantResult: 'OK',
      finalDecision: 'REUSE',
      finalizedAt: '2026-10-19T09:12:00.000Z',
      syncStatus: 'SYNCED',
      lastSyncedAt: '2026-10-19T09:12:30.000Z',
      syncAttempts: 1,
      pdfGenerated: true,
      pdfGeneratedAt: '2026-10-19T09:12:05.000Z',
    };

    const sample2: InspectionRecord = {
      inspectionId: 'INSP-202610-002',
      joNumber: 'JO-2210008492',
      engineModel: 'SAA6D140E-5',
      partNumber: '6217-31-2110',
      pistonPosition: 'Cylinder #2',
      inspectorName: 'S. Tanaka (QC-04)',
      manualNumber: 'SEBM023408-04',
      criteriaRevision: 'Rev 4 (Nov 2023)',
      createdAt: '2026-10-20T10:15:00.000Z',
      updatedAt: '2026-10-20T11:05:00.000Z',
      currentStep: 'COMPLETED',
      currentVisualIndex: 6,
      dimensionalMeasurements: [
        {
          measurementPoint: 'Top Ring Groove Width (#1)',
          criteriaId: 'CRIT-DIM-140-01',
          actualValue: 4.29, // Out of spec (USL 4.25)
          unit: 'mm',
          nominalValue: 4.18,
          lowerLimit: 4.10,
          upperLimit: 4.25,
          ruleType: 'RANGE',
          calculatedResult: 'NG',
          deviation: 0.04,
          manualRevision: 'Rev 4',
          measuredAt: '2026-10-20T10:20:00.000Z',
          correctionHistory: [],
          isConfirmed: true,
        },
        {
          measurementPoint: 'Second Ring Groove Width (#2)',
          criteriaId: 'CRIT-DIM-140-02',
          actualValue: 3.07,
          unit: 'mm',
          nominalValue: 3.05,
          lowerLimit: 3.00,
          upperLimit: 3.12,
          ruleType: 'RANGE',
          calculatedResult: 'OK',
          deviation: 0.02,
          manualRevision: 'Rev 4',
          measuredAt: '2026-10-20T10:22:00.000Z',
          correctionHistory: [],
          isConfirmed: true,
        },
      ],
      visualInspections: [
        {
          areaCode: 'CROWN',
          inspectionArea: 'Crown / Top Surface',
          criteriaId: 'CRIT-VIS-01',
          manualRevision: 'Rev 4',
          inspectorJudgment: 'OK',
          isCompleted: true,
        },
        {
          areaCode: 'BOWL_RIM',
          inspectionArea: 'Combustion Bowl Rim',
          criteriaId: 'CRIT-VIS-02',
          manualRevision: 'Rev 4',
          inspectorJudgment: 'NG',
          inspectorDefectType: 'Pockmark',
          inspectorDefectLocation: 'Bowl Rim 3 o\'clock',
          inspectorRemarks: 'Deep cratering > 1.2mm near re-entrant lip',
          isCompleted: true,
        },
      ],
      penetrantInspection: {
        criteriaId: 'CRIT-PT-01',
        manualRevision: 'Rev 4',
        inspectorJudgment: 'NG',
        inspectorRemarks: 'Linear crack bleed-out on bowl lip edge',
        isCompleted: true,
      },
      dimensionalResult: 'NG',
      visualResult: 'NG',
      penetrantResult: 'NG',
      finalDecision: 'NG_REPLACE',
      finalizedAt: '2026-10-20T11:05:00.000Z',
      syncStatus: 'SYNCED',
      lastSyncedAt: '2026-10-20T11:05:40.000Z',
      syncAttempts: 1,
      pdfGenerated: true,
      pdfGeneratedAt: '2026-10-20T11:05:10.000Z',
    };

    await this.saveInspection(sample1);
    await this.saveInspection(sample2);

    // Also populate a few initial dataset items for AI readiness statistics
    const datasetSeeds: DatasetItem[] = [
      {
        imageId: 'SEED-IMG-001',
        inspectionId: sample1.inspectionId,
        joNumber: sample1.joNumber,
        engineModel: sample1.engineModel,
        partNumber: sample1.partNumber,
        pistonPosition: sample1.pistonPosition,
        inspectionType: 'VISUAL',
        inspectionArea: 'Crown / Top Surface',
        imageTimestamp: '2026-10-19T08:48:00.000Z',
        inspectorJudgment: 'OK',
        verificationStatus: 'VERIFIED',
        manualRevision: 'Rev 4',
      },
      {
        imageId: 'SEED-IMG-002',
        inspectionId: sample1.inspectionId,
        joNumber: sample1.joNumber,
        engineModel: sample1.engineModel,
        partNumber: sample1.partNumber,
        pistonPosition: sample1.pistonPosition,
        inspectionType: 'VISUAL',
        inspectionArea: 'Combustion Bowl Rim',
        imageTimestamp: '2026-10-19T08:51:00.000Z',
        inspectorJudgment: 'OK',
        verificationStatus: 'VERIFIED',
        manualRevision: 'Rev 4',
      },
      {
        imageId: 'SEED-IMG-003',
        inspectionId: sample2.inspectionId,
        joNumber: sample2.joNumber,
        engineModel: sample2.engineModel,
        partNumber: sample2.partNumber,
        pistonPosition: sample2.pistonPosition,
        inspectionType: 'VISUAL',
        inspectionArea: 'Combustion Bowl Rim',
        imageTimestamp: '2026-10-20T10:30:00.000Z',
        inspectorJudgment: 'NG',
        defectClass: 'Pockmark',
        verificationStatus: 'VERIFIED',
        manualRevision: 'Rev 4',
      },
      {
        imageId: 'SEED-IMG-004',
        inspectionId: sample2.inspectionId,
        joNumber: sample2.joNumber,
        engineModel: sample2.engineModel,
        partNumber: sample2.partNumber,
        pistonPosition: sample2.pistonPosition,
        inspectionType: 'PENETRANT',
        inspectionArea: 'Penetrant Inspection',
        imageTimestamp: '2026-10-20T10:45:00.000Z',
        inspectorJudgment: 'NG',
        defectClass: 'Crack Indication',
        verificationStatus: 'VERIFIED',
        manualRevision: 'Rev 4',
      },
    ];

    for (const d of datasetSeeds) {
      await this.saveDatasetItem(d);
    }
  }
}

export const dbService = new InspectionDatabase();
