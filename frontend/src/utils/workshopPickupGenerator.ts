import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const parsePictures = (job: any): string[] => {
  if (!job.item_pictures) return [];
  if (Array.isArray(job.item_pictures)) return job.item_pictures;
  try { return JSON.parse(job.item_pictures); } catch { return []; }
};

export const generateWorkshopPickupPDF = (job: any) => {
  const doc = new jsPDF();
  const primary: [number, number, number] = [234, 88, 12]; // Orange

  doc.setFillColor(primary[0], primary[1], primary[2]);
  doc.rect(0, 0, 210, 42, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('ServiceOS', 15, 22);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Workshop Repair Agreement', 15, 30);

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('WORKSHOP PICKUP INVOICE', 115, 22);

  doc.setTextColor(50, 50, 50);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Customer:', 15, 55);
  doc.setFont('helvetica', 'normal');
  doc.text(job.customer?.name || 'N/A', 15, 62);
  doc.text(job.customer?.phone || '', 15, 68);
  doc.text(job.customer?.area || '', 15, 74);

  doc.setFont('helvetica', 'bold');
  doc.text('Job Info:', 120, 55);
  doc.setFont('helvetica', 'normal');
  doc.text(`Lead ID: ${job.lead_id}`, 120, 62);
  doc.text(`Date: ${new Date().toLocaleDateString('en-GB')}`, 120, 68);
  doc.text(`Technician: ${job.technician?.name || 'Staff'}`, 120, 74);
  doc.text(`Appliance: ${job.product_type}`, 120, 80);

  autoTable(doc, {
    startY: 90,
    head: [['Description', 'Details']],
    body: [
      ['Reported Problem', job.problem_details || 'N/A'],
      ['Diagnosis (Actual Problem)', job.actual_problem || 'Pending diagnosis'],
      ['Agreed Repairs / Parts', job.repair_details || 'As per workshop assessment'],
    ],
    headStyles: { fillColor: primary },
    styles: { fontSize: 9, cellPadding: 4 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 55 } },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 12;
  const total = Number(job.total_amount || 0);
  const advance = Number(job.collected_amount || 0);
  const balance = Math.max(0, total - advance);

  doc.setFillColor(248, 250, 252);
  doc.rect(15, finalY, 180, 38, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Payment Summary', 20, finalY + 10);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Estimated Repair Amount:`, 20, finalY + 20);
  doc.text(`PKR ${total.toLocaleString()}`, 150, finalY + 20, { align: 'right' });
  doc.text(`Advance Received:`, 20, finalY + 28);
  doc.text(`PKR ${advance.toLocaleString()}`, 150, finalY + 28, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.text(`Balance Due on Delivery:`, 20, finalY + 36);
  doc.text(`PKR ${balance.toLocaleString()}`, 150, finalY + 36, { align: 'right' });

  const pics = parsePictures(job);
  if (pics.length > 0) {
    let picY = finalY + 48;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Machine Photos:', 15, picY);
    picY += 6;
    pics.slice(0, 2).forEach((pic, i) => {
      try {
        doc.addImage(pic, 'JPEG', 15 + i * 90, picY, 80, 55);
      } catch { /* skip invalid image */ }
    });
  }

  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(
    'This document confirms machine pickup for workshop repair. Repairs will be performed as agreed above.',
    105, 285, { align: 'center' }
  );

  doc.save(`WorkshopPickup_${job.lead_id}.pdf`);
};
