import { jsPDF } from 'jspdf';
import { extractJobPdfData, savePdf } from './pdfBranding';
import { enrichJobForPdf } from './pdfJobLoader';
import { renderCompactDocument, PREMIUM_DOC_CONFIGS } from './premiumPdfLayout';

const createDoc = () => new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

export const generateCompleteRepairPDF = async (job: any) => {
  const fullJob = await enrichJobForPdf(job);
  const doc = createDoc();
  const data = extractJobPdfData(fullJob);
  renderCompactDocument(doc, data, PREMIUM_DOC_CONFIGS.complete_repair);
  savePdf(doc, `CompleteRepair_${data.leadId}.pdf`);
};
