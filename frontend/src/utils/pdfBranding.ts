import type { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/** Brand palette — www.aljaroshi.com */
export const BRAND = {
  nameEn: 'Hayat Nasser Cooling Est.',
  taglineEn: 'Professional Home Appliance Maintenance',
  website: 'www.aljaroshi.com',
  email: 'support@aljaroshi.com',
  phone: '0580571322',
  city: 'Makkah Al-Mukarramah',
  colors: {
    primary: [23, 51, 96] as [number, number, number],
    accent: [46, 178, 219] as [number, number, number],
    accentLight: [232, 247, 252] as [number, number, number],
    white: [255, 255, 255] as [number, number, number],
    light: [248, 250, 252] as [number, number, number],
    muted: [100, 116, 139] as [number, number, number],
    text: [30, 41, 59] as [number, number, number],
    border: [203, 213, 225] as [number, number, number],
  },
};

const MARGIN = 14;
const CONTENT_W = 182;

export const formatPdfDate = (date: Date | string | null | undefined): string => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatPdfDateTime = (date: Date | string | null | undefined): string => {
  if (!date) return '—';
  const d = new Date(date);
  return `${formatPdfDate(d)}  ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
};

export const formatPdfCurrency = (amount: number | string | null | undefined): string => {
  return `SAR ${Number(amount || 0).toLocaleString()}`;
};

export const formatPdfText = (value: unknown, fallback = '—'): string => {
  if (value == null || value === '') return fallback;
  return String(value);
};

export const getDeliveryDate = (job: any): Date => {
  if (job.warranty_start) return new Date(job.warranty_start);
  if (job.workshop_job?.delivered_at) return new Date(job.workshop_job.delivered_at);
  if (job.updated_at && ['Completed', 'PendingApproval'].includes(job.status)) {
    return new Date(job.updated_at);
  }
  return new Date(job.created_at || Date.now());
};

export const calculateWarrantyExpiry = (job: any): Date | null => {
  const months = Number(job.warranty_months) || 0;
  if (months <= 0) return null;
  if (job.warranty_end) return new Date(job.warranty_end);
  const start = getDeliveryDate(job);
  const end = new Date(start);
  end.setMonth(end.getMonth() + months);
  return end;
};

export const getWarrantyDetails = (job: any) => {
  const months = Number(job.warranty_months) || 0;
  const deliveryDate = getDeliveryDate(job);
  const expiryDate = calculateWarrantyExpiry(job);
  return {
    months,
    deliveryDate,
    expiryDate,
    deliveryLabel: formatPdfDate(deliveryDate),
    expiryLabel: expiryDate ? formatPdfDate(expiryDate) : '—',
    startLabel: formatPdfDate(job.warranty_start),
    hasWarranty: months > 0,
  };
};

const formatJobHistory = (history: any[] | undefined) => {
  if (!Array.isArray(history) || history.length === 0) return [];
  return [...history]
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .map((entry) => ({
      date: formatPdfDateTime(entry.timestamp),
      action: formatPdfText(entry.action),
      notes: entry.notes ? formatPdfText(entry.notes) : '',
      statusChange:
        entry.old_status || entry.new_status
          ? `${formatPdfText(entry.old_status, '—')} → ${formatPdfText(entry.new_status, '—')}`
          : '',
    }));
};

const buildWorkSummary = (job: any) => {
  const parts: string[] = [];
  if (job.problem_details) parts.push(`Customer Complaint:\n${job.problem_details}`);
  if (job.actual_problem) parts.push(`Technician Diagnosis:\n${job.actual_problem}`);
  if (job.repair_details) parts.push(`Field Service Work:\n${job.repair_details}`);
  if (job.workshop_job?.notes) parts.push(`Workshop Repair Work:\n${job.workshop_job.notes}`);
  return parts.length > 0 ? parts.join('\n\n') : 'No work details recorded.';
};

const getWorkshopDays = (job: any) => {
  const ws = job.workshop_job;
  if (!ws) return '—';
  if (ws.current_day_count) return `${ws.current_day_count} day(s)`;
  if (ws.received_date) {
    const diff = Date.now() - new Date(ws.received_date).getTime();
    return `${Math.max(1, Math.floor(diff / (1000 * 3600 * 24)) + 1)} day(s)`;
  }
  return '—';
};

export const parseJobPictures = (job: any): string[] => {
  if (!job.item_pictures) return [];
  let pics: string[] = [];
  if (Array.isArray(job.item_pictures)) pics = job.item_pictures;
  else {
    try {
      pics = JSON.parse(job.item_pictures);
    } catch {
      return [];
    }
  }
  if (job.house_image) return pics.filter((p) => p && p !== job.house_image);
  return pics.filter(Boolean);
};

export const extractJobPdfData = (job: any) => {
  const pics = parseJobPictures(job);
  const warranty = getWarrantyDetails(job);
  const total = Number(job.total_amount || 0);
  const collected = Number(job.collected_amount || 0);
  const agreed = Number(job.agreed_amount || 0);

  return {
    leadId: formatPdfText(job.lead_id),
    status: formatPdfText(job.status),
    createdAt: formatPdfDate(job.created_at),
    updatedAt: formatPdfDate(job.updated_at),
    visitDate: formatPdfDate(job.visit_date),
    assignedAt: formatPdfDate(job.assigned_at),
    generatedAt: formatPdfDateTime(new Date()),

    customerName: formatPdfText(job.customer?.name),
    customerPhone: formatPdfText(job.customer?.phone),
    customerArea: formatPdfText(job.customer?.area),
    exactAddress: formatPdfText(job.exact_address || job.customer?.exact_address),
    mapLink: formatPdfText(job.customer?.google_map_link, '—'),
    coordinates:
      job.lat != null && job.lng != null
        ? `${Number(job.lat).toFixed(5)}, ${Number(job.lng).toFixed(5)}`
        : '—',

    productType: formatPdfText(job.product_type),
    leadDescription: formatPdfText(job.problem_details, 'No lead description provided.'),
    reportedProblem: formatPdfText(job.problem_details),
    actualProblem: formatPdfText(job.actual_problem),
    repairDetails: formatPdfText(job.repair_details),
    fieldWorkDone: formatPdfText(job.repair_details),
    pendingOutcome: formatPdfText(job.pending_outcome),

    technician: formatPdfText(job.technician?.name, 'Staff'),
    technicianPhone: formatPdfText(job.technician?.phone),
    team: job.team?.name ? job.team.name : job.team_id ? `Team #${job.team_id}` : '—',

    agreedAmount: formatPdfCurrency(agreed),
    totalAmount: formatPdfCurrency(total),
    collectedAmount: formatPdfCurrency(collected),
    balanceDue: formatPdfCurrency(Math.max(0, total - collected)),
    paymentConfirmed: job.payment_confirmed ? 'Yes' : 'No',
    warrantyClaim: job.is_warranty_claim ? 'Yes — Warranty Service' : 'No',

    warrantyMonths: warranty.months,
    warrantyStart: warranty.startLabel,
    warrantyDelivery: warranty.deliveryLabel,
    warrantyExpiry: warranty.expiryLabel,
    hasWarranty: warranty.hasWarranty,

    workshopReceived: formatPdfDate(job.workshop_job?.received_date),
    workshopPromised: formatPdfDate(job.workshop_job?.promised_delivery),
    workshopStatus: formatPdfText(job.workshop_job?.status),
    workshopNotes: formatPdfText(job.workshop_job?.notes),
    agreedParts: formatPdfText(job.workshop_job?.agreed_parts || job.repair_details),
    additionalParts: formatPdfText(job.workshop_job?.additional_parts),
    workshopDelivered: formatPdfDate(job.workshop_job?.delivered_at),
    workshopPriority: formatPdfText(job.workshop_job?.priority),
    workshopDays: getWorkshopDays(job),
    hasWorkshopJob: !!job.workshop_job,

    jobHistory: formatJobHistory(job.history),
    workSummary: formatPdfText(buildWorkSummary(job)),
    technicianNotes: formatPdfText(buildWorkSummary(job), 'No work details recorded.'),

    itemPictures: pics,
    houseImage: job.house_image || null,
  };
};

export type JobPdfData = ReturnType<typeof extractJobPdfData>;

export const drawBrandHeader = (
  doc: jsPDF,
  documentTitle: string
): number => {
  const { colors } = BRAND;
  const pageW = doc.internal.pageSize.getWidth();

  doc.setFillColor(...colors.primary);
  doc.rect(0, 0, pageW, 46, 'F');
  doc.setFillColor(...colors.accent);
  doc.rect(0, 46, pageW, 3, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(BRAND.nameEn, MARGIN, 16);

  doc.setTextColor(...colors.accent);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(BRAND.taglineEn, MARGIN, 24);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.text(`${BRAND.website}   •   ${BRAND.phone}   •   ${BRAND.email}`, MARGIN, 38);

  const rightX = pageW - MARGIN;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...colors.accent);
  doc.text(documentTitle, rightX, 20, { align: 'right' });

  doc.setTextColor(210, 225, 240);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(`${BRAND.nameEn}  •  ${BRAND.city}`, rightX, 40, { align: 'right' });

  return 54;
};

/** 4-column invoice meta strip */
export const drawInvoiceMetaStrip = (doc: jsPDF, startY: number, data: JobPdfData): number => {
  const { colors } = BRAND;
  const cols = [
    { label: 'INVOICE NO.', value: data.leadId },
    { label: 'DATE ISSUED', value: data.generatedAt },
    { label: 'JOB STATUS', value: data.status },
    { label: 'TECHNICIAN', value: data.technician },
  ];
  const colW = CONTENT_W / 4;

  doc.setDrawColor(...colors.border);
  doc.setFillColor(...colors.white);
  doc.roundedRect(MARGIN, startY, CONTENT_W, 22, 2, 2, 'FD');

  cols.forEach((col, i) => {
    const x = MARGIN + i * colW;
    if (i > 0) {
      doc.setDrawColor(...colors.border);
      doc.line(x, startY + 2, x, startY + 20);
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...colors.muted);
    doc.text(col.label, x + 4, startY + 7);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...colors.primary);
    const val = doc.splitTextToSize(col.value, colW - 6);
    doc.text(val.slice(0, 2), x + 4, startY + 14);
  });

  return startY + 28;
};

/** Full-width navy section heading — English only (Arabic breaks in Helvetica) */
export const drawSectionBanner = (doc: jsPDF, startY: number, title: string): number => {
  const { colors } = BRAND;
  doc.setFillColor(...colors.primary);
  doc.roundedRect(MARGIN, startY, CONTENT_W, 8, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...colors.white);
  doc.text(title.toUpperCase(), MARGIN + 5, startY + 5.5);
  return startY + 11;
};

const measureRows = (doc: jsPDF, rows: [string, string][], valueX: number, valueW: number) => {
  let h = 0;
  rows.forEach(([, value]) => {
    const lines = doc.splitTextToSize(value, valueW);
    h += Math.max(5.5, lines.length * 4.2);
  });
  return h + 4;
};

const drawRowsInBox = (
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  rows: [string, string][],
  labelW: number
) => {
  const { colors } = BRAND;
  const valueX = x + labelW + 2;
  const valueW = w - labelW - 6;
  let rowY = y + 4;

  rows.forEach(([label, value], idx) => {
    if (idx % 2 === 0) {
      doc.setFillColor(...colors.accentLight);
      doc.rect(x + 1, rowY - 3.2, w - 2, 5.5, 'F');
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...colors.primary);
    doc.text(label, x + 4, rowY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...colors.text);
    const lines = doc.splitTextToSize(value, valueW);
    doc.text(lines, valueX, rowY);
    rowY += Math.max(5.5, lines.length * 4.2);
  });
};

/** Side-by-side Bill To + Service cards */
export const drawTwinInfoCards = (
  doc: jsPDF,
  startY: number,
  leftTitle: string,
  leftRows: [string, string][],
  rightTitle: string,
  rightRows: [string, string][]
): number => {
  const { colors } = BRAND;
  const cardW = 88;
  const gap = 6;
  const leftX = MARGIN;
  const rightX = MARGIN + cardW + gap;

  const leftFiltered = leftRows.filter(([, v]) => v && v !== '—');
  const rightFiltered = rightRows.filter(([, v]) => v && v !== '—');

  doc.setFontSize(7.5);
  const bodyH = Math.max(
    measureRows(doc, leftFiltered, 0, 40),
    measureRows(doc, rightFiltered, 0, 40)
  );
  const cardH = 10 + bodyH;

  [leftX, rightX].forEach((x, i) => {
    const title = i === 0 ? leftTitle : rightTitle;
    const rows = i === 0 ? leftFiltered : rightFiltered;

    doc.setDrawColor(...colors.border);
    doc.setFillColor(...colors.white);
    doc.roundedRect(x, startY, cardW, cardH, 2, 2, 'FD');

    doc.setFillColor(...colors.accent);
    doc.roundedRect(x, startY, cardW, 9, 2, 2, 'F');
    doc.rect(x, startY + 6, cardW, 3, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...colors.primary);
    doc.text(title.toUpperCase(), x + 5, startY + 6);

    drawRowsInBox(doc, x, startY + 9, cardW, rows, 34);
  });

  return startY + cardH + 8;
};

/** Full-width detail block with zebra rows */
export const drawDetailBlock = (
  doc: jsPDF,
  startY: number,
  title: string,
  rows: [string, string][]
): number => {
  const { colors } = BRAND;
  const filtered = rows.filter(([, v]) => v && v !== '—');
  if (filtered.length === 0) return startY;

  doc.setFontSize(7.5);
  const bodyH = measureRows(doc, filtered, 78, 100);
  const blockH = bodyH + 2;
  let y = drawSectionBanner(doc, startY, title);

  doc.setDrawColor(...colors.border);
  doc.setFillColor(...colors.white);
  doc.roundedRect(MARGIN, y, CONTENT_W, blockH, 2, 2, 'FD');
  drawRowsInBox(doc, MARGIN, y, CONTENT_W, filtered, 62);

  return y + blockH + 8;
};

export const getTableTheme = () => {
  const { colors } = BRAND;
  return {
    headStyles: {
      fillColor: colors.primary,
      textColor: colors.white,
      fontStyle: 'bold' as const,
      halign: 'left' as const,
      fontSize: 8.5,
      cellPadding: { top: 4, bottom: 4, left: 5, right: 5 },
    },
    alternateRowStyles: { fillColor: colors.accentLight },
    styles: {
      fontSize: 8,
      cellPadding: 4,
      textColor: colors.text,
      lineColor: colors.border,
      lineWidth: 0.15,
      overflow: 'linebreak' as const,
      valign: 'middle' as const,
    },
    margin: { left: MARGIN, right: MARGIN },
  };
};

export const drawLineItemsTable = (
  doc: jsPDF,
  startY: number,
  data: JobPdfData,
  label = 'Service Line Items'
): number => {
  let y = drawSectionBanner(doc, startY, label);
  const amount = data.totalAmount !== 'SAR 0' ? data.totalAmount : data.collectedAmount;
  const work =
    data.repairDetails !== '—'
      ? data.repairDetails
      : data.actualProblem !== '—'
        ? data.actualProblem
        : data.reportedProblem;

  autoTable(doc, {
    startY: y,
    head: [['#', 'Description', 'Appliance', 'Work Performed', 'Amount']],
    body: [['1', 'Repair & Maintenance Service', data.productType, work, amount]],
    foot: [['', '', '', 'TOTAL DUE', amount]],
    ...getTableTheme(),
    footStyles: {
      fillColor: BRAND.colors.primary,
      textColor: BRAND.colors.white,
      fontStyle: 'bold',
      fontSize: 9,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 38 },
      2: { cellWidth: 28 },
      3: { cellWidth: 'auto' },
      4: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
    },
  });

  return (doc as any).lastAutoTable.finalY + 8;
};

export const drawTotalsPanel = (doc: jsPDF, startY: number, data: JobPdfData): number => {
  const { colors } = BRAND;
  const panelW = 88;
  const panelX = MARGIN + CONTENT_W - panelW;
  const rows = (
    [
      ['Agreed Amount', data.agreedAmount],
      ['Service Total', data.totalAmount !== 'SAR 0' ? data.totalAmount : data.collectedAmount],
      ['Amount Collected', data.collectedAmount],
      ['Balance Due', data.balanceDue],
    ] as [string, string][]
  ).filter(([, v]) => v && v !== '—' && v !== 'SAR 0');

  const panelH = 10 + rows.length * 7 + 4;
  doc.setDrawColor(...colors.border);
  doc.setFillColor(...colors.white);
  doc.roundedRect(panelX, startY, panelW, panelH, 2, 2, 'FD');

  doc.setFillColor(...colors.primary);
  doc.roundedRect(panelX, startY, panelW, 9, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...colors.white);
  doc.text('PAYMENT SUMMARY', panelX + 5, startY + 6);

  let y = startY + 14;
  rows.forEach(([label, value], i) => {
    const isLast = i === rows.length - 1;
    doc.setFont('helvetica', isLast ? 'bold' : 'normal');
    doc.setFontSize(isLast ? 9 : 8);
    doc.setTextColor(...(isLast ? colors.primary : colors.text));
    doc.text(label, panelX + 5, y);
    doc.text(value, panelX + panelW - 5, y, { align: 'right' });
    y += 7;
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...colors.muted);
  doc.text(`Payment Confirmed: ${data.paymentConfirmed}`, panelX + 5, y + 2);

  return startY + panelH + 8;
};

export const drawWarrantyBox = (doc: jsPDF, startY: number, data: JobPdfData): number => {
  const { colors } = BRAND;
  let y = drawSectionBanner(doc, startY, 'Warranty Information');

  const rows: [string, string][] = data.hasWarranty
    ? [
        ['Warranty Period', `${data.warrantyMonths} Month(s)`],
        ['Warranty Start Date', data.warrantyStart],
        ['Service / Delivery Date', data.warrantyDelivery],
        ['Warranty Expires On', data.warrantyExpiry],
        ['Warranty Claim Service', data.warrantyClaim],
      ]
    : [['Coverage', 'No warranty period applies to this service.'] as [string, string]];

  const bodyH = measureRows(doc, rows, 78, 100);
  doc.setDrawColor(...colors.accent);
  doc.setFillColor(...colors.accentLight);
  doc.roundedRect(MARGIN, y, CONTENT_W, bodyH + 2, 2, 2, 'FD');
  drawRowsInBox(doc, MARGIN, y, CONTENT_W, rows, 62);

  return y + bodyH + 10;
};

export const drawPaymentSummaryBox = (
  doc: jsPDF,
  startY: number,
  data: JobPdfData,
  options?: { showBalance?: boolean }
): number => drawTotalsPanel(doc, startY, data);

export const addAllJobPhotos = (doc: jsPDF, data: JobPdfData, startY: number): number => {
  const { colors } = BRAND;
  const images: { label: string; src: string }[] = [];
  if (data.houseImage) images.push({ label: 'House / Location Photo', src: data.houseImage });
  data.itemPictures.forEach((pic, i) =>
    images.push({ label: i === 0 ? 'Product Photo' : `Service Photo ${i}`, src: pic })
  );
  if (images.length === 0) return startY;

  let y = drawSectionBanner(doc, startY, 'Attached Photos');
  y += 3;

  const perRow = 2;
  const imgW = 86;
  const imgH = 54;
  const gap = 10;
  const pageH = doc.internal.pageSize.getHeight();

  images.slice(0, 4).forEach((img, i) => {
    const col = i % perRow;
    const row = Math.floor(i / perRow);
    let iy = y + row * (imgH + 16);
    if (iy + imgH > pageH - 28) {
      doc.addPage();
      y = 20;
      iy = y;
    }
    const x = MARGIN + col * (imgW + gap);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.primary);
    doc.text(img.label, x, iy - 2);

    try {
      const format = img.src.startsWith('data:image/png') ? 'PNG' : 'JPEG';
      doc.setDrawColor(...colors.border);
      doc.setFillColor(...colors.light);
      doc.roundedRect(x, iy, imgW, imgH, 1, 1, 'FD');
      doc.addImage(img.src, format, x + 1, iy + 1, imgW - 2, imgH - 2);
    } catch {
      doc.setFontSize(7);
      doc.setTextColor(...colors.muted);
      doc.text('Image unavailable', x + 4, iy + 20);
    }
  });

  const rows = Math.ceil(Math.min(images.length, 4) / perRow);
  return y + rows * (imgH + 16) + 6;
};

export const drawPdfFooter = (doc: jsPDF, disclaimer: string) => {
  const { colors } = BRAND;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const footerY = pageH - 20;

  doc.setFillColor(...colors.primary);
  doc.rect(0, footerY, pageW, 20, 'F');
  doc.setFillColor(...colors.accent);
  doc.rect(0, footerY, pageW, 2, 'F');

  doc.setTextColor(220, 235, 245);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'italic');
  doc.text(disclaimer, pageW / 2, footerY + 8, { align: 'center', maxWidth: 170 });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...colors.accent);
  doc.text(
    `${BRAND.nameEn}  •  ${BRAND.website}  •  ${BRAND.phone}  •  ${BRAND.email}`,
    pageW / 2,
    footerY + 15,
    { align: 'center' }
  );
};

export const savePdf = (doc: jsPDF, filename: string) => {
  const pdfBlob = doc.output('blob');
  const url = URL.createObjectURL(pdfBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const buildCustomerRows = (d: JobPdfData): [string, string][] => [
  ['Name', d.customerName],
  ['Phone', d.customerPhone],
  ['Area', d.customerArea],
  ['Address', d.exactAddress],
  ['Map Link', d.mapLink.length > 55 ? d.mapLink.slice(0, 55) + '…' : d.mapLink],
  ['GPS', d.coordinates],
];

export const buildJobRows = (d: JobPdfData): [string, string][] => [
  ['Job ID', d.leadId],
  ['Status', d.status],
  ['Appliance', d.productType],
  ['Created', d.createdAt],
  ['Updated', d.updatedAt],
  ['Visit Date', d.visitDate],
  ['Assigned', d.assignedAt],
  ['Technician', d.technician],
  ['Team', d.team],
  ['Outcome', d.pendingOutcome],
];

export const buildProblemRows = (d: JobPdfData): [string, string][] => [
  ['Reported Issue', d.reportedProblem],
  ['Diagnosis', d.actualProblem],
  ['Work Performed', d.repairDetails],
  ['Warranty Claim', d.warrantyClaim],
];

export const buildFinancialRows = (d: JobPdfData): [string, string][] => [
  ['Agreed Amount', d.agreedAmount],
  ['Total Amount', d.totalAmount],
  ['Collected', d.collectedAmount],
  ['Balance Due', d.balanceDue],
  ['Payment Confirmed', d.paymentConfirmed],
];

export const buildWorkshopRows = (d: JobPdfData): [string, string][] => [
  ['Workshop Status', d.workshopStatus],
  ['Priority', d.workshopPriority],
  ['Received', d.workshopReceived],
  ['Promised Delivery', d.workshopPromised],
  ['Delivered', d.workshopDelivered],
  ['Workshop Notes', d.workshopNotes],
];

// Legacy aliases
export const drawDocumentMetaBar = drawInvoiceMetaStrip;
export const drawKeyValueSection = drawDetailBlock;
