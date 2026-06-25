import { jsPDF } from 'jspdf';
import { extractJobPdfData, savePdf } from './pdfBranding';
import { enrichJobForPdf, normalizeJobForPdf } from './pdfJobLoader';
import { renderCompactDocument, PREMIUM_DOC_CONFIGS } from './premiumPdfLayout';

export const generateWorkshopPickupPDF = async (input: any) => {
  const normalized = normalizeJobForPdf(input);
  const fullJob = await enrichJobForPdf(normalized);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const data = extractJobPdfData(fullJob);
  renderCompactDocument(doc, data, PREMIUM_DOC_CONFIGS.workshop);
  savePdf(doc, `WorkshopPickup_${data.leadId}.pdf`);
};
