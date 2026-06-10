export function getLeadPictures(lead: {
  item_pictures?: string[] | string | null;
  house_image?: string | null;
}): string[] {
  if (!lead.item_pictures) return lead.house_image ? [lead.house_image] : [];
  if (Array.isArray(lead.item_pictures)) return lead.item_pictures;
  if (typeof lead.item_pictures === 'string') {
    try {
      const parsed = JSON.parse(lead.item_pictures);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function getFinalAmount(lead: {
  collected_amount?: number | string | null;
  total_amount?: number | string | null;
  agreed_amount?: number | string | null;
}): number {
  const collected = Number(lead.collected_amount || 0);
  const total = Number(lead.total_amount || 0);
  const agreed = Number(lead.agreed_amount || 0);
  return collected || total || agreed || 0;
}

export function formatPKR(amount: number | string | null | undefined): string {
  return `PKR ${Number(amount || 0).toLocaleString()}`;
}

/** Matches lead against search query across ID, customer, phone, area, product, issue, tech */
export function matchesLeadSearch(lead: any, searchTerm: string): boolean {
  const q = searchTerm.trim().toLowerCase();
  if (!q) return true;
  return (
    lead.lead_id?.toLowerCase().includes(q) ||
    lead.customer?.name?.toLowerCase().includes(q) ||
    lead.customer?.phone?.includes(searchTerm.trim()) ||
    lead.customer?.area?.toLowerCase().includes(q) ||
    lead.product_type?.toLowerCase().includes(q) ||
    (lead.problem_details || '').toLowerCase().includes(q) ||
    (lead.technician?.name || '').toLowerCase().includes(q) ||
    (lead.exact_address || '').toLowerCase().includes(q)
  );
}
