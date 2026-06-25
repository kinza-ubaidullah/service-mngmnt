import { jsPDF } from 'jspdf';
import { extractJobPdfData, savePdf } from './pdfBranding';
import { enrichJobForPdf } from './pdfJobLoader';
import { renderCompactDocument, PREMIUM_DOC_CONFIGS } from './premiumPdfLayout';

export const generateInspectionReportPDF = async (job: any) => {
  const fullJob = await enrichJobForPdf(job);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const data = extractJobPdfData(fullJob);
  renderCompactDocument(doc, data, PREMIUM_DOC_CONFIGS.inspection);
  savePdf(doc, `Inspection_${data.leadId}.pdf`);
};
