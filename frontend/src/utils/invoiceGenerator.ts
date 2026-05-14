import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateInvoicePDF = (job: any) => {
  const doc = new jsPDF();
  const primaryColor: [number, number, number] = [79, 70, 229]; // Indigo-600

  // 1. Header
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('ServiceOS', 15, 25);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Premium Appliance Service & Repair', 15, 32);
  
  doc.setFontSize(18);
  doc.text('INVOICE', 160, 25);

  // 2. Job Info Header
  doc.setTextColor(50, 50, 50);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Invoice To:', 15, 55);
  doc.text('Job Details:', 120, 55);
  
  doc.setFont('helvetica', 'normal');
  doc.text(job.customer.name, 15, 62);
  doc.text(job.customer.phone, 15, 67);
  doc.text(job.customer.area || '', 15, 72);
  doc.text(job.customer.exact_address || '', 15, 77, { maxWidth: 80 });
  
  doc.text(`Lead ID: ${job.lead_id}`, 120, 62);
  doc.text(`Date: ${new Date(job.created_at).toLocaleDateString()}`, 120, 67);
  doc.text(`Technician: ${job.technician?.name || 'Staff'}`, 120, 72);

  // 3. Table of Services
  autoTable(doc, {
    startY: 90,
    head: [['Description', 'Product', 'Details', 'Total']],
    body: [
      [
        'Repair Service', 
        job.product_type, 
        job.repair_details || job.actual_problem || 'Standard Maintenance', 
        `$ ${job.total_amount || job.collected_amount || 0}`
      ]
    ],
    headStyles: { fillColor: primaryColor },
    styles: { fontSize: 9, cellPadding: 5 },
  });

  // 4. Totals & Warranty
  const finalY = (doc as any).lastAutoTable.finalY + 15;
  
  doc.setFont('helvetica', 'bold');
  doc.text('Total Amount:', 140, finalY);
  doc.text(`$ ${job.total_amount || job.collected_amount || 0}`, 175, finalY);
  
  doc.setFillColor(245, 245, 245);
  doc.rect(15, finalY + 10, 180, 25, 'F');
  
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFontSize(11);
  doc.text('WARRANTY INFORMATION', 20, finalY + 18);
  
  doc.setTextColor(80, 80, 80);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Months: ${job.warranty_months || 0} Month(s)`, 20, finalY + 25);
  doc.text(`Expires On: ${job.warranty_end ? new Date(job.warranty_end).toLocaleDateString() : 'N/A'}`, 120, finalY + 25);

  // 5. Footer
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('Thank you for choosing ServiceOS for your appliance needs!', 105, 280, { align: 'center' });
  doc.text('This is a computer generated invoice.', 105, 285, { align: 'center' });

  // 6. Manual Download Trigger (More robust than doc.save)
  const pdfBlob = doc.output('blob');
  const url = URL.createObjectURL(pdfBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Invoice_${job.lead_id}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
