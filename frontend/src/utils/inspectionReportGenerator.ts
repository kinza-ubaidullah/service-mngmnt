import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const parsePictures = (job: any): string[] => {
  if (!job.item_pictures) return [];
  if (Array.isArray(job.item_pictures)) return job.item_pictures;
  try { return JSON.parse(job.item_pictures); } catch { return []; }
};

export const generateInspectionReportPDF = (job: any) => {
  const doc = new jsPDF();
  const primary: [number, number, number] = [217, 119, 6]; // Amber

  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, 210, 42, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('SERVICEOS', 15, 22);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Professional Appliance Repair', 15, 30);

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('INSPECTION REPORT', 115, 24);

  doc.setTextColor(50, 50, 50);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Lead ID:', 15, 55);
  doc.text('Date:', 15, 62);
  doc.setFont('helvetica', 'normal');
  doc.text(job.lead_id, 40, 55);
  doc.text(new Date().toLocaleDateString('en-GB'), 40, 62);

  doc.setFont('helvetica', 'bold');
  doc.text('Customer:', 120, 55);
  doc.setFont('helvetica', 'normal');
  doc.text(job.customer?.name || 'N/A', 120, 62);
  doc.text(job.customer?.phone || '', 120, 68);
  doc.text(job.customer?.area || '', 120, 74);

  autoTable(doc, {
    startY: 82,
    head: [['Field', 'Details']],
    body: [
      ['Appliance Type', job.product_type],
      ['Reported Problem', job.problem_details || 'N/A'],
      ['Actual Problem Found', job.actual_problem || 'N/A'],
      ['Inspection Notes', job.repair_details || 'N/A'],
      ['Inspection Charge', `PKR ${Number(job.collected_amount || 0).toLocaleString()}`],
      ['Technician', job.technician?.name || 'Staff'],
    ],
    headStyles: { fillColor: primary },
    styles: { fontSize: 9, cellPadding: 4 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } },
  });

  let finalY = (doc as any).lastAutoTable.finalY + 10;
  const pics = parsePictures(job);
  if (pics.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Machine Photos', 15, finalY);
    finalY += 6;
    pics.slice(0, 2).forEach((pic, i) => {
      try {
        doc.addImage(pic, 'JPEG', 15 + i * 90, finalY, 80, 55);
      } catch { /* skip */ }
    });
    finalY += 62;
  }

  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(
    'This inspection report documents the assessed problem and inspection charges. It is not a final repair invoice.',
    105, 285, { align: 'center' }
  );

  doc.save(`Inspection_${job.lead_id}.pdf`);
};
