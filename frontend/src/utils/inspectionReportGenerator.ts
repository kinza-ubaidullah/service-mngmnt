import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const generateInspectionReportPDF = (job: any) => {
  const doc = new jsPDF();
  
  // Custom font setup (Helvetica is default, using it)
  doc.setFont("helvetica");

  // Header - Primary Color
  doc.setFillColor(30, 41, 59); // Slate 900
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("SERVICEOS", 14, 25);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Professional Appliance Repair", 14, 32);

  // INspection Report Title
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("INSPECTION REPORT", 120, 25);

  // Dates & Details
  doc.setTextColor(80, 80, 80);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`Lead ID:`, 14, 50);
  doc.text(`Date:`, 14, 57);
  
  doc.setFont("helvetica", "normal");
  doc.text(`${job.lead_id}`, 40, 50);
  doc.text(`${new Date().toLocaleDateString()}`, 40, 57);

  // Customer Info
  doc.setFont("helvetica", "bold");
  doc.text("Customer Details:", 120, 50);
  doc.setFont("helvetica", "normal");
  doc.text(job.customer.name, 120, 57);
  doc.text(job.customer.phone, 120, 64);
  doc.text(job.customer.area, 120, 71);

  // Divider
  doc.setDrawColor(220, 220, 220);
  doc.line(14, 80, 196, 80);

  // Appliance Details
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Appliance Overview", 14, 95);

  const tableColumn = ["Appliance Type", "Reported Problem", "Current Status"];
  const tableRows = [
    [
      job.product_type,
      job.problem_details || "N/A",
      job.status
    ]
  ];

  (doc as any).autoTable({
    startY: 105,
    head: [tableColumn],
    body: tableRows,
    theme: 'grid',
    headStyles: { fillColor: [99, 102, 241], textColor: 255 }, // Indigo 500
    styles: { fontSize: 10, cellPadding: 5 },
    alternateRowStyles: { fillColor: [248, 250, 252] }, // Slate 50
  });

  // Technician Initial Findings (Placeholder for technician to fill or software to display)
  const finalY = (doc as any).lastAutoTable.finalY + 15;
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Technician Inspection Notes", 14, finalY);

  // Draw a big box for manual notes if printed, or show digital notes if any
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(250, 250, 250);
  doc.rect(14, finalY + 5, 182, 40, 'FD');
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Detailed assessment and recommended repairs:", 18, finalY + 12);
  
  // Footer
  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.text("This is an initial inspection report and does not represent a final invoice.", 105, 280, { align: 'center' });

  // Download
  doc.save(`Inspection_${job.lead_id}.pdf`);
};
