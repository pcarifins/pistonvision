import { jsPDF } from 'jspdf';
import { InspectionRecord } from '../types/inspection';
import { OFFICIAL_MANUAL_INFO } from '../data/criteriaMaster';

export function generatePistonQCPdf(inspection: InspectionRecord): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 14;

  // --- Header Banner (Komatsu Deep Blue) ---
  doc.setFillColor(15, 47, 87); // #0F2F57
  doc.rect(10, y, pageWidth - 20, 22, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text('PISTONVISION QC', 15, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(220, 230, 245);
  doc.text('PISTON REUSE INSPECTION CHECKSHEET', 15, y + 15);

  doc.setFontSize(8);
  doc.text(`DOC ID: ${inspection.inspectionId}`, pageWidth - 15, y + 8, { align: 'right' });
  doc.text(`DATE: ${new Date(inspection.updatedAt).toLocaleDateString()}`, pageWidth - 15, y + 15, { align: 'right' });

  y += 26;

  // --- Identification & Standards Table ---
  doc.setDrawColor(200, 210, 225);
  doc.setFillColor(248, 250, 252);
  doc.rect(10, y, pageWidth - 20, 24, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(50, 65, 85);

  // Column 1
  doc.text('JOB ORDER (JO):', 14, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(inspection.joNumber || '-', 46, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.text('ENGINE MODEL:', 14, y + 12);
  doc.setFont('helvetica', 'normal');
  doc.text(inspection.engineModel || '-', 46, y + 12);

  doc.setFont('helvetica', 'bold');
  doc.text('PART NUMBER:', 14, y + 18);
  doc.setFont('helvetica', 'normal');
  doc.text(inspection.partNumber || '-', 46, y + 18);

  // Column 2
  doc.setFont('helvetica', 'bold');
  doc.text('CYLINDER POS:', 105, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(inspection.pistonPosition || '-', 135, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.text('INSPECTOR:', 105, y + 12);
  doc.setFont('helvetica', 'normal');
  doc.text(inspection.inspectorName || 'QC Inspector', 135, y + 12);

  doc.setFont('helvetica', 'bold');
  doc.text('MANUAL REF:', 105, y + 18);
  doc.setFont('helvetica', 'normal');
  doc.text(`${OFFICIAL_MANUAL_INFO.manualNumber} (${OFFICIAL_MANUAL_INFO.revision})`, 135, y + 18);

  y += 28;

  // --- SECTION A: DIMENSIONAL INSPECTION ---
  doc.setFillColor(225, 235, 248);
  doc.rect(10, y, pageWidth - 20, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 47, 87);
  doc.text('SECTION A: DIMENSIONAL INSPECTION', 14, y + 5);

  // Status badge on section right
  const dimIsOk = inspection.dimensionalResult === 'OK';
  doc.setTextColor(dimIsOk ? 0 : 180, dimIsOk ? 130 : 20, dimIsOk ? 50 : 20);
  doc.text(`[ ${inspection.dimensionalResult} ]`, pageWidth - 14, y + 5, { align: 'right' });

  y += 9;

  // Table header
  doc.setFillColor(240, 243, 248);
  doc.rect(10, y, pageWidth - 20, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(70, 80, 95);
  doc.text('Measurement Point', 14, y + 4.2);
  doc.text('Standard Limits', 95, y + 4.2);
  doc.text('Actual', 135, y + 4.2);
  doc.text('Dev.', 158, y + 4.2);
  doc.text('Result', 178, y + 4.2);

  y += 6;

  // Table rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);

  for (const m of inspection.dimensionalMeasurements) {
    doc.setDrawColor(230, 235, 245);
    doc.line(10, y + 5.5, pageWidth - 10, y + 5.5);

    doc.setTextColor(40, 50, 60);
    doc.text(m.measurementPoint.substring(0, 48), 14, y + 4);
    doc.text(`${m.lowerLimit.toFixed(2)} - ${m.upperLimit.toFixed(2)} ${m.unit}`, 95, y + 4);
    doc.text(m.actualValue !== null ? `${m.actualValue.toFixed(2)} ${m.unit}` : 'N/A', 135, y + 4);
    
    const devStr = m.deviation !== null ? (m.deviation > 0 ? `+${m.deviation.toFixed(2)}` : `${m.deviation.toFixed(2)}`) : '-';
    doc.text(devStr, 158, y + 4);

    if (m.calculatedResult === 'OK') {
      doc.setTextColor(20, 140, 60);
      doc.setFont('helvetica', 'bold');
      doc.text('OK', 178, y + 4);
    } else if (m.calculatedResult === 'NG') {
      doc.setTextColor(200, 30, 30);
      doc.setFont('helvetica', 'bold');
      doc.text('NG', 178, y + 4);
    } else {
      doc.setTextColor(150, 150, 150);
      doc.text('-', 178, y + 4);
    }
    doc.setFont('helvetica', 'normal');
    y += 6;
  }

  y += 4;

  // --- SECTION B: VISUAL INSPECTION ---
  doc.setFillColor(225, 235, 248);
  doc.rect(10, y, pageWidth - 20, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 47, 87);
  doc.text('SECTION B: VISUAL INSPECTION (AI-ASSISTED)', 14, y + 5);

  const visIsOk = inspection.visualResult === 'OK';
  doc.setTextColor(visIsOk ? 0 : 180, visIsOk ? 130 : 20, visIsOk ? 50 : 20);
  doc.text(`[ ${inspection.visualResult} ]`, pageWidth - 14, y + 5, { align: 'right' });

  y += 9;

  // Table header
  doc.setFillColor(240, 243, 248);
  doc.rect(10, y, pageWidth - 20, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(70, 80, 95);
  doc.text('Inspection Area', 14, y + 4.2);
  doc.text('Inspector Judgment', 80, y + 4.2);
  doc.text('Defect Observed', 120, y + 4.2);
  doc.text('Remarks', 155, y + 4.2);

  y += 6;

  for (const v of inspection.visualInspections) {
    doc.setDrawColor(230, 235, 245);
    doc.line(10, y + 5, pageWidth - 10, y + 5);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40, 50, 60);
    doc.text(v.inspectionArea.substring(0, 35), 14, y + 3.8);

    if (v.inspectorJudgment === 'OK') {
      doc.setTextColor(20, 140, 60);
      doc.setFont('helvetica', 'bold');
      doc.text('✓ OK', 80, y + 3.8);
    } else if (v.inspectorJudgment === 'NG') {
      doc.setTextColor(200, 30, 30);
      doc.setFont('helvetica', 'bold');
      doc.text('✕ NG', 80, y + 3.8);
    } else if (v.inspectorJudgment === 'REVIEW') {
      doc.setTextColor(200, 120, 10);
      doc.setFont('helvetica', 'bold');
      doc.text('⚠ REVIEW', 80, y + 3.8);
    } else {
      doc.setTextColor(150, 150, 150);
      doc.text('PENDING', 80, y + 3.8);
    }

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 70, 80);
    doc.text((v.inspectorDefectType || '-').substring(0, 20), 120, y + 3.8);
    doc.text((v.inspectorRemarks || '-').substring(0, 24), 155, y + 3.8);

    y += 5.5;
  }

  y += 4;

  // --- SECTION C: PENETRANT INSPECTION ---
  doc.setFillColor(225, 235, 248);
  doc.rect(10, y, pageWidth - 20, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 47, 87);
  doc.text('SECTION C: DYE PENETRANT INSPECTION (PT)', 14, y + 5);

  const ptIsOk = inspection.penetrantResult === 'OK';
  doc.setTextColor(ptIsOk ? 0 : 180, ptIsOk ? 130 : 20, ptIsOk ? 50 : 20);
  doc.text(`[ ${inspection.penetrantResult} ]`, pageWidth - 14, y + 5, { align: 'right' });

  y += 9;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(40, 50, 60);
  doc.text('Penetrant Process: White non-aqueous developer applied on critical high-stress zones.', 14, y + 4);
  doc.text(`Inspector Judgment: ${inspection.penetrantInspection.inspectorJudgment} - ${inspection.penetrantInspection.inspectorRemarks || 'No crack indications detected'}`, 14, y + 9);

  y += 14;

  // --- SECTION D: AI DATASET & MODEL INFORMATION ---
  doc.setFillColor(245, 247, 250);
  doc.rect(10, y, pageWidth - 20, 16, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(60, 75, 95);
  doc.text('SECTION D: AI MODEL & DATASET METADATA', 14, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Operational Mode: DATASET COLLECTION (YOLO In-Training Pipeline)', 14, y + 10);
  doc.text('Architecture: Mobile YOLOv11 TensorRT Edge Core (Advisory only - Inspector verification required)', 14, y + 14);

  y += 20;

  // --- SECTION E: FINAL JUDGMENT BANNER ---
  let bannerBg = [220, 252, 231]; // Green #dcfce7
  let bannerBorder = [34, 197, 94];
  let bannerText = [22, 101, 52];
  let decisionLabel = 'REUSE PERMITTED';

  if (inspection.finalDecision === 'NG_REPLACE') {
    bannerBg = [254, 226, 226];
    bannerBorder = [239, 68, 68];
    bannerText = [153, 27, 27];
    decisionLabel = 'REPLACE / SCRAP (NG)';
  } else if (inspection.finalDecision === 'QC_REVIEW') {
    bannerBg = [254, 243, 199];
    bannerBorder = [245, 158, 11];
    bannerText = [146, 64, 14];
    decisionLabel = 'QC / ENGINEERING REVIEW REQUIRED';
  } else if (inspection.finalDecision === 'INCOMPLETE') {
    bannerBg = [241, 245, 249];
    bannerBorder = [148, 163, 184];
    bannerText = [51, 65, 85];
    decisionLabel = 'INCOMPLETE INSPECTION';
  }

  doc.setFillColor(bannerBg[0], bannerBg[1], bannerBg[2]);
  doc.setDrawColor(bannerBorder[0], bannerBorder[1], bannerBorder[2]);
  doc.setLineWidth(0.8);
  doc.rect(10, y, pageWidth - 20, 18, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(bannerText[0], bannerText[1], bannerText[2]);
  doc.text(`FINAL REUSE DECISION: ${decisionLabel}`, 15, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Criteria Authority: ${OFFICIAL_MANUAL_INFO.manualNumber} ${OFFICIAL_MANUAL_INFO.revision}`, 15, y + 14);
  doc.text(`Timestamp: ${inspection.finalizedAt || new Date().toISOString()}`, pageWidth - 15, y + 14, { align: 'right' });

  y += 24;

  // --- Sign-off Signatures ---
  doc.setDrawColor(180, 190, 205);
  doc.setLineWidth(0.3);
  doc.line(15, y + 10, 75, y + 10);
  doc.line(pageWidth - 75, y + 10, pageWidth - 15, y + 10);

  doc.setFontSize(7.5);
  doc.setTextColor(100, 115, 130);
  doc.text('Inspector Signature / Shop QC Stamp', 15, y + 14);
  doc.text('Lead Reman Engineer Sign-off', pageWidth - 75, y + 14);

  return doc;
}
