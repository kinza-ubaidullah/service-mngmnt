import { prisma } from './prisma.js';

export const generateLeadId = async (): Promise<string> => {
  const date = new Date();
  const day = String(date.getDate()).padStart(2, '0');
  const month = date.toLocaleString('en-US', { month: 'short' }).toUpperCase();
  const year = String(date.getFullYear()).slice(-2);
  const datePrefix = `${day}${month}${year}`; // e.g., 03MAY26

  // Find the latest lead created today to get the sequence number
  const lastLead = await prisma.lead.findFirst({
    where: {
      lead_id: {
        startsWith: datePrefix
      }
    },
    orderBy: {
      id: 'desc'
    }
  });

  let nextSequence = 1;
  if (lastLead) {
    const lastSequenceStr = lastLead.lead_id.slice(-3); // Get last 3 digits
    const lastSequence = parseInt(lastSequenceStr, 10);
    if (!isNaN(lastSequence)) {
      nextSequence = lastSequence + 1;
    }
  }

  const nextSequenceStr = String(nextSequence).padStart(3, '0');
  return `${datePrefix}${nextSequenceStr}`;
};
