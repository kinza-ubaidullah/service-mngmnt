export const generateLeadId = async (
  date: Date,
  getLastSequenceNumber: (datePrefix: string) => Promise<number>
): Promise<string> => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = date.toLocaleString('en-US', { month: 'short' }).toUpperCase();
  const year = String(date.getFullYear()).slice(-2);
  const datePrefix = `${day}${month}${year}`; // e.g., 16APR26

  const sequence = await getLastSequenceNumber(datePrefix);
  const nextSequence = String(sequence + 1).padStart(3, '0');

  return `${datePrefix}${nextSequence}`;
};
