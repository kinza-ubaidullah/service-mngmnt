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

/** Product photos only — excludes house/location image */
export function getProductPictures(lead: {
  item_pictures?: string[] | string | null;
  house_image?: string | null;
}): string[] {
  const pics = getLeadPictures(lead);
  if (!lead.house_image) return pics;
  return pics.filter((p) => p && p !== lead.house_image);
}

export interface LabeledLeadImage {
  src: string;
  title: string;
  description: string;
  category: 'house' | 'product' | 'service';
}

/**
 * Returns every lead image with a human-readable label + explanation of what it is.
 * - house_image  → customer location / building (captured at lead creation)
 * - item_pictures[0] → main product photo (the appliance reported for service)
 * - item_pictures[1+] → additional field / repair photos (added by technician during work)
 */
export function getLabeledLeadImages(lead: {
  item_pictures?: string[] | string | null;
  house_image?: string | null;
}): LabeledLeadImage[] {
  const images: LabeledLeadImage[] = [];

  if (lead.house_image) {
    images.push({
      src: lead.house_image,
      title: 'House / Location Photo',
      description: "Customer's building — helps the technician locate the address",
      category: 'house',
    });
  }

  const pics = getLeadPictures(lead).filter((p) => p && p !== lead.house_image);
  pics.forEach((src, i) => {
    if (i === 0) {
      images.push({
        src,
        title: 'Product Photo',
        description: 'The appliance / item reported by the customer for service',
        category: 'product',
      });
    } else {
      images.push({
        src,
        title: `Service Photo ${i}`,
        description: 'Additional appliance, fault or repair-work photo from the field',
        category: 'service',
      });
    }
  });

  return images;
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

export function formatSAR(amount: number | string | null | undefined): string {
  return `SAR ${Number(amount || 0).toLocaleString()}`;
}

/** @deprecated use formatSAR */
export const formatPKR = formatSAR;

/** Human-readable task type from outcome / status */
export function getTaskTypeLabel(lead: { status?: string; pending_outcome?: string | null }): string {
  const outcome = lead.pending_outcome;
  if (outcome === 'PickedForWorkshop') return 'Workshop Pickup';
  if (outcome === 'InspectionCompleted') return 'Inspection';
  if (outcome === 'WorkshopDelivery') return 'Workshop Delivery';
  if (lead.status === 'InspectionCompleted') return 'Inspection';
  if (lead.status === 'PickedForWorkshop') return 'Workshop Pickup';
  return 'On-Site Repair';
}

/** Map popup status label (never show raw PendingApproval for workshop pickups) */
export function getMapStatusLabel(lead: { status?: string; pending_outcome?: string | null }): string {
  if (lead.status === 'PendingApproval') return `${getTaskTypeLabel(lead)} · Awaiting Approval`;
  if (lead.status === 'PickedForWorkshop') return 'At Workshop';
  return lead.status || 'Unknown';
}

/** Leads that should appear on the live operations map */
export const MAP_EXCLUDED_STATUSES = [
  'Completed',
  'Cancelled',
  'Deleted',
  'InspectionCompleted',
  'PendingApproval',
  'PickedForWorkshop',
] as const;

export function isMapVisibleLead(lead: { status?: string }): boolean {
  return !!lead.status && !(MAP_EXCLUDED_STATUSES as readonly string[]).includes(lead.status);
}

/** Determines if a lead should be visible on the main unified dashboard map */
export function isGlobalMapVisibleLead(lead: { status?: string; pending_outcome?: string | null }): boolean {
  if (!lead.status) return false;
  if (['Cancelled', 'Deleted', 'Completed', 'InspectionCompleted'].includes(lead.status)) return false;
  // Exclude regular PendingApproval (onsite awaiting approval to admin)
  // Keep Workshop pending approval (pending_outcome === 'PickedForWorkshop')
  if (lead.status === 'PendingApproval' && lead.pending_outcome !== 'PickedForWorkshop') {
    return false;
  }
  return true;
}

/** Map view filter modes */
export type MapViewFilter = 'operational' | 'workshop' | 'completed';

export function isWorkshopMapLead(lead: { status?: string; pending_outcome?: string | null }): boolean {
  return (
    lead.status === 'PickedForWorkshop' ||
    (lead.status === 'PendingApproval' && lead.pending_outcome === 'PickedForWorkshop')
  );
}

export function isCompletedMapLead(lead: { status?: string }): boolean {
  return lead.status === 'Completed' || lead.status === 'InspectionCompleted';
}

export function isMapVisibleForFilter(lead: { status?: string; pending_outcome?: string | null }, mode: MapViewFilter): boolean {
  if (!lead.status) return false;
  if (mode === 'workshop') return isWorkshopMapLead(lead);
  if (mode === 'completed') return isCompletedMapLead(lead);
  return isMapVisibleLead(lead);
}

export function isRejectedLead(lead: { rejection_note?: string | null }): boolean {
  return !!lead.rejection_note?.trim();
}

export function isComplaintLead(lead: { status?: string }): boolean {
  return lead.status === 'Complaint';
}

export function isUnassignedLead(lead: { status?: string }): boolean {
  return lead.status === 'New' || lead.status === 'Complaint';
}

export function isDelayedLead(lead: { status?: string; visit_date?: string | null }): boolean {
  return lead.status === 'Assigned' && !!lead.visit_date && new Date(lead.visit_date) < new Date();
}

export function isCompletedLead(lead: { status?: string }): boolean {
  return lead.status === 'Completed' || lead.status === 'InspectionCompleted';
}

export function isCancelledLead(lead: { status?: string }): boolean {
  return lead.status === 'Cancelled';
}

export const CANCELLABLE_LEAD_STATUSES = ['New', 'Assigned', 'InProgress', 'Reopened', 'Complaint', 'PendingApproval'] as const;

export function isCancellableLead(lead: { status?: string }): boolean {
  return (CANCELLABLE_LEAD_STATUSES as readonly string[]).includes(lead.status || '');
}

export type LeadFeedFilter =
  | 'all'
  | 'new'
  | 'assigned'
  | 'inprogress'
  | 'completed'
  | 'cancelled'
  | 'deleted'
  | 'delay'
  | 'pending'
  | 'voice';

export const APPLIANCE_OPTIONS = [
  'Washing Machine',
  'Refrigerator / Fridge',
  'Air Conditioner',
  'Microwave',
  'Water Heater',
  'Dishwasher',
  'Other Appliance',
] as const;

export type LeadProductEntry = {
  type: string;
  problem: string;
  images: string[];
};

/** Parse `[Product]: detail` segments from combined problem_details */
export function parseProblemForProduct(combined: string | null | undefined, productType: string): string {
  if (!combined?.trim()) return '';
  const parts = combined.split(/\s*\|\s*/);
  for (const part of parts) {
    const match = part.match(/^\[([^\]]+)\]:\s*([\s\S]+)$/);
    if (match && match[1].trim() === productType) return match[2].trim();
  }
  return '';
}

export function buildCombinedProblemDetails(products: LeadProductEntry[]): string {
  return products
    .filter((p) => p.problem.trim())
    .map((p) => `[${p.type}]: ${p.problem.trim()}`)
    .join(' | ');
}

/** Full per-product rows for forms (problems + images for edit) */
export function getLeadProductEntries(lead: {
  products?: Array<{ product_type: string; problem_details?: string | null }>;
  product_type?: string | null;
  problem_details?: string | null;
  item_pictures?: string[] | string | null;
  house_image?: string | null;
}): LeadProductEntry[] {
  const itemPics = getProductPictures(lead);
  let entries: LeadProductEntry[] = [];

  if (Array.isArray(lead.products) && lead.products.length > 0) {
    entries = lead.products.map((p) => ({
      type: p.product_type,
      problem:
        p.problem_details?.trim() ||
        parseProblemForProduct(lead.problem_details, p.product_type) ||
        '',
      images: [] as string[],
    }));
  } else {
    const types = parseProductTypes(lead.product_type);
    if (types.length === 0 && lead.product_type?.trim()) {
      types.push(lead.product_type.trim());
    }
    entries = types.map((type) => ({
      type,
      problem:
        parseProblemForProduct(lead.problem_details, type) ||
        (types.length === 1 ? lead.problem_details?.trim() || '' : ''),
      images: [] as string[],
    }));
  }

  if (itemPics.length > 0 && entries.length > 0) {
    if (entries.length === 1) {
      entries[0] = { ...entries[0], images: [...itemPics] };
    } else {
      const chunk = Math.max(1, Math.ceil(itemPics.length / entries.length));
      entries = entries.map((entry, i) => ({
        ...entry,
        images: itemPics.slice(i * chunk, (i + 1) * chunk),
      }));
    }
  }

  return entries.length > 0 ? entries : [];
}

export function mergeProductImagesIntoPayload(products: LeadProductEntry[], extraItemPictures: string[] = []) {
  const allProductImages = products.flatMap((p) => p.images);
  return [...extraItemPictures, ...allProductImages];
}

export function productsToApiPayload(products: LeadProductEntry[]) {
  return {
    products: products.map((p) => ({ product_type: p.type, problem_details: p.problem })),
    product_type: products.map((p) => p.type).join(', '),
    problem_details: buildCombinedProblemDetails(products),
  };
}

/** Parse comma-separated product_type into array */
export function parseProductTypes(productType?: string | null): string[] {
  if (!productType?.trim()) return [];
  return productType.split(/[,;|+]/).map((p) => p.trim()).filter(Boolean);
}

/** Products from lead_products table or legacy product_type */
export function getLeadProducts(lead: {
  products?: Array<{ product_type: string; problem_details?: string | null }>;
  product_type?: string | null;
}): string[] {
  if (Array.isArray(lead.products) && lead.products.length > 0) {
    return lead.products.map((p) => p.product_type).filter(Boolean);
  }
  return parseProductTypes(lead.product_type);
}

export function formatProductTypesDisplay(productType?: string | null, lead?: { products?: Array<{ product_type: string }> }): string {
  const parts = lead ? getLeadProducts(lead as any) : parseProductTypes(productType);
  return parts.length > 0 ? parts.join(' · ') : productType || '—';
}

export function leadMatchesProductFilter(
  lead: { products?: Array<{ product_type: string }>; product_type?: string | null },
  productFilter: string
): boolean {
  if (productFilter === 'all') return true;
  return getLeadProducts(lead).some((p) => p === productFilter);
}

export const CLOSED_LEAD_STATUSES = ['Completed', 'Cancelled', 'Deleted', 'InspectionCompleted'] as const;

export function isActiveOperationalLeadStatus(status?: string): boolean {
  return !!status && !(CLOSED_LEAD_STATUSES as readonly string[]).includes(status);
}

export function hasVoiceNote(lead: { voice_note?: string | null }): boolean {
  return !!lead.voice_note?.trim();
}

export function countLeadsForFilter(leads: any[], filter: LeadFeedFilter): number {
  switch (filter) {
    case 'new':
      return leads.filter(isUnassignedLead).length;
    case 'assigned':
      return leads.filter((l) => isAssignedTaskStatus(l.status)).length;
    case 'inprogress':
      return leads.filter((l) => l.status === 'InProgress').length;
    case 'pending':
      return leads.filter((l) => l.status === 'PendingApproval').length;
    case 'completed':
      return leads.filter(isCompletedLead).length;
    case 'cancelled':
      return leads.filter(isCancelledLead).length;
    case 'deleted':
      return leads.filter((l) => l.status === 'Deleted').length;
    case 'delay':
      return leads.filter(isDelayedLead).length;
    case 'voice':
      return leads.filter(hasVoiceNote).length;
    case 'all':
      return leads.filter((l) => l.status !== 'Deleted').length;
    default:
      return leads.length;
  }
}

export function filterLeadsByStatusTab(leads: any[], filter: LeadFeedFilter): any[] {
  switch (filter) {
    case 'new':
      return leads.filter(isUnassignedLead);
    case 'assigned':
      return leads.filter((l) => isAssignedTaskStatus(l.status));
    case 'inprogress':
      return leads.filter((l) => l.status === 'InProgress');
    case 'pending':
      return leads.filter((l) => l.status === 'PendingApproval');
    case 'completed':
      return leads.filter(isCompletedLead);
    case 'cancelled':
      return leads.filter(isCancelledLead);
    case 'deleted':
      return leads.filter((l) => l.status === 'Deleted');
    case 'delay':
      return leads.filter(isDelayedLead);
    case 'voice':
      return leads.filter(hasVoiceNote);
    case 'all':
      return leads.filter((l) => l.status !== 'Deleted');
    default:
      return leads;
  }
}

export function countActiveOperationalLeads(leads: any[]): number {
  return leads.filter(
    (l) => !['Completed', 'Cancelled', 'Deleted', 'InspectionCompleted'].includes(l.status)
  ).length;
}

export const ACTIVE_JOB_STATUSES = ['Assigned', 'InProgress', 'Reopened'] as const;

export const ASSIGNED_TASK_STATUSES = ['Assigned', 'InProgress', 'Reopened', 'PickedForWorkshop'] as const;

export function isActiveJobStatus(status: string): boolean {
  return (ACTIVE_JOB_STATUSES as readonly string[]).includes(status);
}

export function isAssignedTaskStatus(status: string): boolean {
  return (ASSIGNED_TASK_STATUSES as readonly string[]).includes(status);
}

export function countActiveJobsForTechnician(technicianId: number, leads: any[]): number {
  return leads.filter(
    (l) => l.technician?.id === technicianId && isActiveJobStatus(l.status)
  ).length;
}

export function countAssignedTasksForTechnician(technicianId: number, leads: any[]): number {
  return leads.filter(
    (l) => l.technician?.id === technicianId && isAssignedTaskStatus(l.status)
  ).length;
}

export function getTechnicianWorkloadBreakdown(technicianId: number, leads: any[]) {
  const techLeads = leads.filter((l) => l.technician?.id === technicianId);
  return {
    active: techLeads.filter((l) => isActiveJobStatus(l.status)).length,
    assigned: techLeads.filter((l) => l.status === 'Assigned').length,
    inProgress: techLeads.filter((l) => l.status === 'InProgress').length,
    reopened: techLeads.filter((l) => l.status === 'Reopened').length,
    workshop: techLeads.filter((l) => l.status === 'PickedForWorkshop').length,
    totalTasks: techLeads.filter((l) => isAssignedTaskStatus(l.status)).length,
    allAssigned: techLeads.filter((l) => l.status !== 'Deleted' && l.status !== 'New' && l.status !== 'Cancelled').length,
  };
}

export function filterLeadsForAssignedTab(
  leads: any[],
  technicianFilter: number | 'all',
  teamFilter: number | 'all'
): any[] {
  let result = leads.filter((l) => isAssignedTaskStatus(l.status));
  if (technicianFilter !== 'all') result = filterLeadsByTechnician(result, technicianFilter);
  if (teamFilter !== 'all') result = filterLeadsByTeam(result, teamFilter);
  return result;
}

export function filterLeadsByTechnician(leads: any[], technicianId: number | 'all'): any[] {
  if (technicianId === 'all') return leads;
  return leads.filter((l) => l.technician?.id === technicianId);
}

export function filterLeadsByTeam(leads: any[], teamId: number | 'all'): any[] {
  if (teamId === 'all') return leads;
  return leads.filter((l) => l.team_id === teamId);
}

/** Changes when any lead coordinates change — forces map markers to refresh */
export function buildLeadsLocationKey(leads: any[]): string {
  return leads
    .map((l) => `${l.id}:${l.lat ?? ''}:${l.lng ?? ''}:${l.customer?.google_map_link ?? ''}`)
    .join('|');
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
