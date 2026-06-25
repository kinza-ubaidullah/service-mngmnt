import type { jsPDF } from 'jspdf';
import { BRAND, type JobPdfData } from './pdfBranding';

const M = 16;
const W = 178;
const PAGE_H = 297;

const C = {
  navy: BRAND.colors.primary,
  accent: BRAND.colors.accent,
  white: BRAND.colors.white,
  gray: BRAND.colors.light,
  grayMid: [226, 232, 240] as [number, number, number],
  muted: BRAND.colors.muted,
  text: BRAND.colors.text,
};

export type PremiumDocType = 'invoice' | 'inspection' | 'workshop';

export interface PremiumDocConfig {
  type: PremiumDocType;
  titleLine1: string;
  titleLine2: string;
  refLabel: string;
  page2DocLabel: string;
  footerNote: string;
  showWarranty: boolean;
}

export const PREMIUM_DOC_CONFIGS: Record<PremiumDocType, PremiumDocConfig> = {
  invoice: {
    type: 'invoice',
    titleLine1: 'SERVICE',
    titleLine2: 'INVOICE',
    refLabel: 'INVOICE NUMBER',
    page2DocLabel: 'Invoice',
    footerNote:
      'Computer-generated invoice. Retain for warranty records. Contact: ' + BRAND.phone,
    showWarranty: true,
  },
  inspection: {
    type: 'inspection',
    titleLine1: 'INSPECTION',
    titleLine2: 'REPORT',
    refLabel: 'REPORT REFERENCE',
    page2DocLabel: 'Inspection Report',
    footerNote:
      'Inspection report — not a final repair invoice. Contact: ' + BRAND.phone,
    showWarranty: false,
  },
  workshop: {
    type: 'workshop',
    titleLine1: 'WORKSHOP',
    titleLine2: 'PICKUP RECEIPT',
    refLabel: 'RECEIPT NUMBER',
    page2DocLabel: 'Workshop Pickup',
    footerNote:
      'Workshop pickup receipt. Balance due on delivery. Contact: ' + BRAND.phone,
    showWarranty: false,
  },
};

const roundedCard = (
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: [number, number, number] = C.white,
  border: [number, number, number] = C.grayMid
) => {
  doc.setFillColor(...fill);
  doc.setDrawColor(...border);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, w, h, 3, 3, 'FD');
};

const drawIconDot = (doc: jsPDF, x: number, y: number) => {
  doc.setFillColor(...C.accent);
  doc.circle(x, y, 1.2, 'F');
};

const wrapText = (doc: jsPDF, text: string, maxW: number, fontSize: number) => {
  doc.setFontSize(fontSize);
  return doc.splitTextToSize(text, maxW);
};

const drawCompanyLogo = (doc: jsPDF, x: number, y: number) => {
  doc.setFillColor(...C.navy);
  doc.roundedRect(x, y, 22, 22, 4, 4, 'F');
  doc.setFillColor(...C.accent);
  doc.roundedRect(x + 14, y + 2, 8, 8, 2, 2, 'F');
  doc.setTextColor(...C.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('HN', x + 6, y + 14);
};

const getCustomerLocation = (data: JobPdfData) => {
  if (data.exactAddress !== '—') return data.exactAddress;
  if (data.coordinates !== '—') return `GPS: ${data.coordinates}`;
  if (data.mapLink !== '—') return data.mapLink.length > 55 ? data.mapLink.slice(0, 55) + '…' : data.mapLink;
  return '—';
};

const drawPremiumHeader = (doc: jsPDF, config: PremiumDocConfig): number => {
  roundedCard(doc, M, M, W, 28, C.white, C.grayMid);
  drawCompanyLogo(doc, M + 5, M + 5);

  const infoX = M + 32;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...C.navy);
  doc.text(BRAND.nameEn, infoX, M + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...C.muted);
  doc.text(BRAND.taglineEn, infoX, M + 18);
  doc.text(BRAND.phone, infoX, M + 23);

  const rightX = M + W - 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...C.navy);
  doc.text(config.titleLine1, rightX, M + 13, { align: 'right' });
  doc.setTextColor(...C.accent);
  doc.setFontSize(config.titleLine2.length > 12 ? 12 : 15);
  doc.text(config.titleLine2, rightX, M + 21, { align: 'right' });

  return M + 36;
};

const drawDocBadges = (doc: jsPDF, startY: number, data: JobPdfData, refLabel: string): number => {
  const badgeH = 14;

  doc.setFillColor(...C.navy);
  doc.roundedRect(M, startY, 72, badgeH, 3, 3, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(180, 200, 220);
  doc.text(refLabel, M + 6, startY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...C.white);
  doc.text(data.leadId, M + 6, startY + 11);

  const dateX = M + 76;
  doc.setFillColor(...C.gray);
  doc.setDrawColor(...C.grayMid);
  doc.roundedRect(dateX, startY, 52, badgeH, 3, 3, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...C.muted);
  doc.text('ISSUE DATE', dateX + 6, startY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...C.navy);
  doc.text(data.generatedAt.split('  ')[0] || data.generatedAt, dateX + 6, startY + 11);

  const statusX = dateX + 56;
  const statusW = M + W - statusX;
  doc.setFillColor(...C.accent);
  doc.roundedRect(statusX, startY, statusW, badgeH, 3, 3, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(220, 245, 255);
  doc.text('JOB STATUS', statusX + 6, startY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...C.white);
  doc.text(data.status, statusX + 6, startY + 11);

  return startY + 18;
};

type CardField = { label: string; value: string };

const drawModernCard = (doc: jsPDF, x: number, y: number, w: number, title: string, fields: CardField[]): number => {
  const filtered = fields.filter((f) => f.value && f.value !== '—');
  let bodyH = 12;
  doc.setFontSize(8);
  filtered.forEach((f) => {
    const lines = wrapText(doc, f.value, w - 38, 8);
    bodyH += Math.max(7, lines.length * 3.8);
  });

  roundedCard(doc, x, y, w, bodyH, C.white, C.grayMid);
  doc.setFillColor(...C.navy);
  doc.roundedRect(x, y, w, 10, 3, 3, 'F');
  doc.rect(x, y + 7, w, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...C.white);
  doc.text(title.toUpperCase(), x + 6, y + 7);

  let rowY = y + 14;
  filtered.forEach((f, i) => {
    if (i % 2 === 0) {
      doc.setFillColor(...C.gray);
      doc.rect(x + 1, rowY - 3, w - 2, 7, 'F');
    }
    drawIconDot(doc, x + 6, rowY - 1);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...C.muted);
    doc.text(f.label, x + 10, rowY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...C.text);
    doc.text(wrapText(doc, f.value, w - 38, 8), x + 34, rowY);
    rowY += Math.max(7, wrapText(doc, f.value, w - 38, 8).length * 3.8);
  });

  return bodyH;
};

const buildCustomerFields = (data: JobPdfData): CardField[] => [
  { label: 'Name', value: data.customerName },
  { label: 'Phone', value: data.customerPhone },
  { label: 'Area', value: data.customerArea },
  { label: 'Address', value: getCustomerLocation(data) },
  { label: 'Map Link', value: data.mapLink !== getCustomerLocation(data) ? data.mapLink : '—' },
  { label: 'GPS', value: data.coordinates },
];

const buildServiceFields = (data: JobPdfData, config: PremiumDocConfig): CardField[] => {
  const base: CardField[] = [
    { label: 'Job ID', value: data.leadId },
    { label: 'Status', value: data.status },
    { label: 'Appliance', value: data.productType },
    { label: 'Technician', value: data.technician },
    { label: 'Tech. Phone', value: data.technicianPhone },
    { label: 'Team', value: data.team },
    { label: 'Visit Date', value: data.visitDate },
    { label: 'Created', value: data.createdAt },
    { label: 'Assigned', value: data.assignedAt },
  ];
  if (config.type === 'inspection') {
    base.push({ label: 'Inspection Date', value: data.generatedAt.split('  ')[0] || data.generatedAt });
  }
  if (config.type === 'workshop') {
    base.push({ label: 'Pickup Date', value: data.generatedAt.split('  ')[0] || data.generatedAt });
  }
  base.push({ label: 'Outcome', value: data.pendingOutcome });
  base.push({ label: 'Warranty Claim', value: data.warrantyClaim });
  return base;
};

const drawOverviewCards = (doc: jsPDF, startY: number, data: JobPdfData, config: PremiumDocConfig): number => {
  const cardW = (W - 6) / 2;
  const leftH = drawModernCard(doc, M, startY, cardW, 'Customer Information', buildCustomerFields(data));
  const rightH = drawModernCard(
    doc,
    M + cardW + 6,
    startY,
    cardW,
    config.type === 'workshop' ? 'Pickup Information' : 'Service Information',
    buildServiceFields(data, config)
  );
  return startY + Math.max(leftH, rightH) + 8;
};

const drawServiceProcessCard = (doc: jsPDF, startY: number, data: JobPdfData, title = 'SERVICE PROCESS'): number => {
  const sections = [
    { label: 'Lead Description', value: data.leadDescription, color: C.muted },
    { label: 'Reported Issue', value: data.reportedProblem, color: C.muted },
    { label: 'Diagnosis', value: data.actualProblem, color: C.accent },
    { label: 'Field Work Done', value: data.fieldWorkDone, color: C.navy },
    { label: 'Workshop Repair Work', value: data.workshopNotes, color: C.accent },
  ].filter((s, idx) => {
    if (idx === 0) return true;
    if (s.label === 'Reported Issue' && s.value === data.leadDescription) return false;
    return s.value && s.value !== '—';
  });

  let totalH = 14;
  sections.forEach((s) => {
    totalH += Math.max(14, wrapText(doc, s.value, W - 50, 8).length * 4 + 8);
  });

  roundedCard(doc, M, startY, W, totalH, C.white, C.grayMid);
  doc.setFillColor(...C.accent);
  doc.roundedRect(M, startY, W, 10, 3, 3, 'F');
  doc.rect(M, startY + 7, W, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...C.white);
  doc.text(title, M + 6, startY + 7);

  let y = startY + 14;
  sections.forEach((section, idx) => {
    if (idx > 0) {
      doc.setDrawColor(...C.grayMid);
      doc.setLineWidth(0.2);
      doc.line(M + 6, y - 2, M + W - 6, y - 2);
    }
    doc.setFillColor(...section.color);
    doc.roundedRect(M + 6, y, 38, 6, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...C.white);
    doc.text(section.label.toUpperCase(), M + 8, y + 4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...C.text);
    doc.text(wrapText(doc, section.value, W - 50, 8.5), M + 48, y + 4);
    y += Math.max(14, wrapText(doc, section.value, W - 50, 8.5).length * 4 + 8);
  });

  return startY + totalH + 8;
};

const drawWorkshopDetailsCard = (doc: jsPDF, startY: number, data: JobPdfData): number => {
  const fields: CardField[] = [
    { label: 'Workshop Status', value: data.workshopStatus },
    { label: 'Priority', value: data.workshopPriority },
    { label: 'Days in Workshop', value: data.workshopDays },
    { label: 'Received Date', value: data.workshopReceived },
    { label: 'Promised Delivery', value: data.workshopPromised },
    { label: 'Delivered', value: data.workshopDelivered },
    { label: 'Agreed Parts', value: data.agreedParts },
    { label: 'Additional Parts Used', value: data.additionalParts },
    { label: 'Workshop Notes', value: data.workshopNotes },
    { label: 'Field Work (Before Pickup)', value: data.fieldWorkDone },
  ];
  const h = drawModernCard(doc, M, startY, W, 'Workshop Details', fields);
  return startY + h + 8;
};

const drawJobTimelineCard = (doc: jsPDF, startY: number, data: JobPdfData): number => {
  if (!data.jobHistory.length) return startY;

  let y = startY;
  const footerReserve = 28;

  const ensureSpace = (needed: number) => {
    if (y + needed > PAGE_H - footerReserve) {
      doc.addPage();
      y = M;
    }
  };

  ensureSpace(20);
  doc.setFillColor(...C.navy);
  doc.roundedRect(M, y, W, 9, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...C.white);
  doc.text('JOB ACTIVITY LOG', M + 6, y + 6);
  y += 12;

  data.jobHistory.forEach((entry, idx) => {
    const noteLines = entry.notes ? wrapText(doc, entry.notes, W - 20, 7.5) : [];
    const entryH = 16 + noteLines.length * 3.6 + (entry.statusChange ? 4 : 0);
    ensureSpace(entryH + 4);

    roundedCard(doc, M, y, W, entryH, C.white, C.grayMid);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...C.accent);
    doc.text(entry.date, M + 6, y + 5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...C.navy);
    doc.text(entry.action, M + 6, y + 10);

    let lineY = y + 14;
    if (entry.statusChange && entry.statusChange !== '— → —') {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...C.muted);
      doc.text(`Status: ${entry.statusChange}`, M + 6, lineY);
      lineY += 4;
    }

    if (noteLines.length > 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...C.text);
      doc.text(noteLines, M + 6, lineY);
    }

    y += entryH + 4;
    if (idx === data.jobHistory.length - 1) return;
  });

  return y + 4;
};

const drawPricingCard = (doc: jsPDF, startY: number, data: JobPdfData, config: PremiumDocConfig): number => {
  const cardH = 52;
  roundedCard(doc, M, startY, W, cardH, C.white, C.grayMid);

  doc.setFillColor(...C.navy);
  doc.roundedRect(M, startY, W, 11, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...C.white);
  doc.text('PAYMENT SUMMARY', M + 6, startY + 7.5);

  let rows: [string, string][];
  let totalLabel: string;
  let totalValue: string;

  if (config.type === 'inspection') {
    rows = [
      ['Inspection Charge', data.collectedAmount],
      ['Agreed Amount', data.agreedAmount],
      ['Payment Status', data.paymentConfirmed === 'Yes' ? 'Confirmed' : 'Pending'],
    ];
    totalLabel = 'INSPECTION FEE';
    totalValue = data.collectedAmount;
  } else if (config.type === 'workshop') {
    rows = [
      ['Estimated Repair', data.totalAmount],
      ['Advance Received', data.collectedAmount],
      ['Agreed Amount', data.agreedAmount],
      ['Payment Status', data.paymentConfirmed === 'Yes' ? 'Confirmed' : 'Pending'],
    ];
    totalLabel = 'BALANCE DUE';
    totalValue = data.balanceDue;
  } else {
    rows = [
      ['Agreed Amount', data.agreedAmount],
      ['Amount Collected', data.collectedAmount],
      ['Payment Status', data.paymentConfirmed === 'Yes' ? 'Confirmed' : 'Pending'],
    ];
    totalLabel = 'SERVICE TOTAL';
    totalValue = data.totalAmount !== 'SAR 0' ? data.totalAmount : data.collectedAmount;
  }

  const filtered = rows.filter(([, v]) => v && v !== '—' && v !== 'SAR 0');

  let y = startY + 16;
  filtered.forEach(([label, value]) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...C.muted);
    doc.text(label, M + 8, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.text);
    doc.text(value, M + 75, y);
    y += 6;
  });

  const totalX = M + W - 78;
  doc.setFillColor(...C.accent);
  doc.roundedRect(totalX, startY + 14, 72, 34, 4, 4, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...C.white);
  doc.text(totalLabel, totalX + 36, startY + 22, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(totalValue, totalX + 36, startY + 34, { align: 'center' });
  if (config.type === 'invoice') {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(`Balance: ${data.balanceDue}`, totalX + 36, startY + 42, { align: 'center' });
  }

  return startY + cardH + 8;
};

const drawWarrantyCertificate = (doc: jsPDF, startY: number, data: JobPdfData): number => {
  const cardH = data.hasWarranty ? 48 : 28;
  const claimNo = `WC-${data.leadId}`;

  doc.setDrawColor(...C.accent);
  doc.setLineWidth(0.8);
  doc.setFillColor(252, 253, 255);
  doc.roundedRect(M, startY, W, cardH, 4, 4, 'FD');
  doc.setDrawColor(...C.navy);
  doc.setLineWidth(0.3);
  doc.roundedRect(M + 2, startY + 2, W - 4, cardH - 4, 3, 3, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...C.navy);
  doc.text('WARRANTY CERTIFICATE', M + W / 2, startY + 10, { align: 'center' });
  doc.setDrawColor(...C.accent);
  doc.line(M + 40, startY + 12, M + W - 40, startY + 12);

  if (!data.hasWarranty) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(...C.muted);
    doc.text('No warranty coverage applies to this service.', M + W / 2, startY + 20, { align: 'center' });
    return startY + cardH + 6;
  }

  const cols: [string, string][] = [
    ['Warranty Period', `${data.warrantyMonths} Month(s)`],
    ['Warranty Start', data.warrantyStart !== '—' ? data.warrantyStart : data.warrantyDelivery],
    ['Warranty Expiry', data.warrantyExpiry],
    ['Claim Reference', claimNo],
  ];

  const colW = (W - 12) / 2;
  cols.forEach(([label, value], i) => {
    const x = M + 8 + (i % 2) * colW;
    const y = startY + 18 + Math.floor(i / 2) * 12;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...C.muted);
    doc.text(label.toUpperCase(), x, y);
    doc.setFontSize(9);
    doc.setTextColor(...C.navy);
    doc.text(value, x, y + 5);
  });

  return startY + cardH + 6;
};

const drawPremiumPage2 = (doc: jsPDF, data: JobPdfData, config: PremiumDocConfig) => {
  doc.addPage();
  let y = M;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...C.navy);
  doc.text('Service Documentation', M, y + 6);
  doc.setFontSize(8);
  doc.setTextColor(...C.muted);
  doc.text(`${config.page2DocLabel} ${data.leadId}  •  ${data.customerName}  •  ${data.productType}`, M, y + 12);
  y += 18;

  if (data.jobHistory.length > 0) {
    y = drawJobTimelineCard(doc, y, data);
    y += 4;
  }

  const images: { label: string; caption: string; src: string | null }[] = [
    {
      label: 'House / Location Photo',
      caption: "Customer's building — for navigation",
      src: data.houseImage,
    },
    ...data.itemPictures.map((src, i) => ({
      label: i === 0 ? 'Product Photo' : `Service Photo ${i}`,
      caption:
        i === 0
          ? 'Appliance reported by the customer'
          : 'Field / repair-work photo',
      src,
    })),
  ].filter((img) => img.src);

  if (images.length > 0) {
    doc.setFillColor(...C.navy);
    doc.roundedRect(M, y, W, 8, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...C.white);
    doc.text('SERVICE PHOTOS', M + 6, y + 5.5);
    y += 12;

    const cardW = (W - 8) / 2;
    const imgH = 58;
    const rowH = imgH + 18;

    images.forEach((img, i) => {
      const col = i % 2;
      if (col === 0 && i > 0) y += rowH;
      if (col === 0 && y + rowH > PAGE_H - 26) {
        doc.addPage();
        y = M;
      }
      const fullWidth = images.length % 2 === 1 && i === images.length - 1;
      const cw = fullWidth ? W : cardW;
      const x = fullWidth ? M : M + col * (cardW + 8);
      const iy = y;

      roundedCard(doc, x, iy, cw, imgH + 16, C.white, C.grayMid);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...C.navy);
      doc.text(img.label, x + 6, iy + 6);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(...C.muted);
      doc.text(img.caption, x + 6, iy + 10.5);

      try {
        if (img.src) {
          const fmt = img.src.startsWith('data:image/png') ? 'PNG' : 'JPEG';
          doc.addImage(img.src, fmt, x + 4, iy + 13, cw - 8, imgH);
        }
      } catch {
        doc.setFontSize(7);
        doc.setTextColor(...C.muted);
        doc.text('Photo unavailable', x + 6, iy + 30);
      }
    });

    y += rowH + 8;
    if (y + 50 > PAGE_H - 26) {
      doc.addPage();
      y = M;
    }
  } else {
    roundedCard(doc, M, y, W, 24, C.gray, C.grayMid);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(...C.muted);
    doc.text('No service photos attached to this job.', M + W / 2, y + 14, { align: 'center' });
    y += 32;
  }

  doc.setFillColor(...C.navy);
  doc.roundedRect(M, y, W, 9, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...C.white);
  doc.text('COMPLETE WORK SUMMARY', M + 6, y + 6);

  const noteLines = wrapText(doc, data.workSummary, W - 16, 8);
  const notesH = Math.max(28, noteLines.length * 4.2 + 12);
  roundedCard(doc, M, y + 9, W, notesH, C.white, C.grayMid);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...C.text);
  doc.text(noteLines, M + 8, y + 18);

  drawPremiumFooter(doc, config.footerNote);
};

const drawPremiumFooter = (doc: jsPDF, disclaimer: string) => {
  const pageW = 210;
  const footerY = PAGE_H - 22;

  doc.setFillColor(...C.navy);
  doc.rect(0, footerY, pageW, 22, 'F');
  doc.setFillColor(...C.accent);
  doc.rect(0, footerY, pageW, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...C.white);
  doc.text(BRAND.nameEn, pageW / 2, footerY + 8, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...C.accent);
  doc.text(`${BRAND.website}   •   ${BRAND.email}   •   ${BRAND.phone}`, pageW / 2, footerY + 14, {
    align: 'center',
  });

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6);
  doc.setTextColor(180, 200, 220);
  doc.text(disclaimer, pageW / 2, footerY + 19, { align: 'center', maxWidth: 170 });
};

/** Unified premium renderer for all document types */
export const renderPremiumDocument = (doc: jsPDF, data: JobPdfData, config: PremiumDocConfig) => {
  let y = drawPremiumHeader(doc, config);
  y = drawDocBadges(doc, y, data, config.refLabel);
  y = drawOverviewCards(doc, y, data, config);

  if (config.type === 'workshop') {
    if (y > 200) {
      doc.addPage();
      y = M;
    }
    y = drawWorkshopDetailsCard(doc, y, data);
  } else if (data.hasWorkshopJob) {
    if (y > 210) {
      doc.addPage();
      y = M;
    }
    y = drawWorkshopDetailsCard(doc, y, data);
  }

  if (y > 195) {
    doc.addPage();
    y = M;
  }
  y = drawServiceProcessCard(
    doc,
    y,
    data,
    config.type === 'inspection' ? 'INSPECTION FINDINGS' : 'SERVICE PROCESS'
  );

  if (y > 210) {
    doc.addPage();
    y = M;
  }
  y = drawPricingCard(doc, y, data, config);

  if (config.showWarranty) {
    if (y > 230) {
      doc.addPage();
      y = M;
    }
    drawWarrantyCertificate(doc, y, data);
  }

  drawPremiumPage2(doc, data, config);
};

/** Compact photo grid for essential PDFs */
const drawCompactPhotos = (doc: jsPDF, startY: number, data: JobPdfData): number => {
  const images: { label: string; src: string }[] = [];
  if (data.houseImage) images.push({ label: 'Location Photo', src: data.houseImage });
  data.itemPictures.forEach((pic, i) => {
    images.push({ label: i === 0 ? 'Product Photo' : `Work Photo ${i}`, src: pic });
  });
  if (images.length === 0) return startY;

  let y = startY;
  const footerReserve = 28;
  if (y + 70 > PAGE_H - footerReserve) {
    doc.addPage();
    y = M;
  }

  doc.setFillColor(...C.navy);
  doc.roundedRect(M, y, W, 8, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...C.white);
  doc.text('SERVICE PHOTOS', M + 6, y + 5.5);
  y += 12;

  const perRow = 2;
  const imgW = (W - 6) / perRow;
  const imgH = 42;
  const rowH = imgH + 14;

  images.slice(0, 6).forEach((img, i) => {
    const col = i % perRow;
    if (col === 0 && i > 0) y += rowH;
    if (y + rowH > PAGE_H - footerReserve) {
      doc.addPage();
      y = M;
    }
    const x = M + col * (imgW + 6);
    roundedCard(doc, x, y, imgW, imgH + 10, C.white, C.grayMid);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...C.navy);
    doc.text(img.label, x + 4, y + 5);
    try {
      const fmt = img.src.startsWith('data:image/png') ? 'PNG' : 'JPEG';
      doc.addImage(img.src, fmt, x + 3, y + 7, imgW - 6, imgH);
    } catch {
      doc.setFontSize(7);
      doc.setTextColor(...C.muted);
      doc.text('Photo unavailable', x + 6, y + 24);
    }
  });

  return y + rowH + 6;
};

/** Single-page PDF — essential fields + photos, no activity log */
export const renderCompactDocument = (doc: jsPDF, data: JobPdfData, config: PremiumDocConfig) => {
  let y = drawPremiumHeader(doc, config);
  y = drawDocBadges(doc, y, data, config.refLabel);

  const cardW = (W - 6) / 2;
  const customerFields: CardField[] = [
    { label: 'Name', value: data.customerName },
    { label: 'Phone', value: data.customerPhone },
    { label: 'Area', value: data.customerArea },
    { label: 'Address', value: getCustomerLocation(data) },
  ];
  const jobFields: CardField[] = [
    { label: 'Appliance', value: data.productType },
    { label: 'Technician', value: data.technician },
    { label: 'Tech Phone', value: data.technicianPhone },
    {
      label: config.type === 'workshop' ? 'Pickup Date' : config.type === 'inspection' ? 'Inspection Date' : 'Service Date',
      value: data.generatedAt.split('  ')[0] || data.generatedAt,
    },
  ];
  const leftH = drawModernCard(doc, M, y, cardW, 'Customer', customerFields);
  const rightH = drawModernCard(
    doc,
    M + cardW + 6,
    y,
    cardW,
    config.type === 'workshop' ? 'Pickup Details' : 'Job Details',
    jobFields
  );
  y += Math.max(leftH, rightH) + 8;

  const summaryFields: CardField[] = [
    { label: 'Reported Issue', value: data.reportedProblem },
    { label: 'Diagnosis', value: data.actualProblem },
    { label: 'Work / Parts Used', value: data.fieldWorkDone },
  ];
  if (config.type === 'workshop') {
    summaryFields.push({ label: 'Agreed Parts', value: data.agreedParts });
  }
  const summaryTitle =
    config.type === 'inspection' ? 'Inspection Findings' : config.type === 'workshop' ? 'Pickup Summary' : 'Service Summary';
  y += drawModernCard(doc, M, y, W, summaryTitle, summaryFields) + 8;

  y = drawPricingCard(doc, y, data, config);

  if (config.showWarranty) {
    if (y > 220) {
      doc.addPage();
      y = M;
    }
    y = drawWarrantyCertificate(doc, y, data);
  }

  y = drawCompactPhotos(doc, y, data);

  drawPremiumFooter(doc, config.footerNote);
};

/** @deprecated use renderPremiumDocument */
export const renderPremiumInvoice = (doc: jsPDF, data: JobPdfData) => {
  renderPremiumDocument(doc, data, PREMIUM_DOC_CONFIGS.invoice);
};
