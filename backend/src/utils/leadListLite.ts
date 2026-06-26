export function parseItemPictures(item_pictures: unknown): string[] {
  if (!item_pictures) return [];
  if (Array.isArray(item_pictures)) return item_pictures as string[];
  if (typeof item_pictures === 'string') {
    try {
      const parsed = JSON.parse(item_pictures);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

/** Strip heavy image payloads from list responses — keeps one thumbnail only */
export function liteLeadForList(lead: Record<string, unknown>) {
  const pics = parseItemPictures(lead.item_pictures);
  const thumb = pics[0] || lead.house_image || lead.product_image || null;
  return {
    ...lead,
    item_pictures: thumb ? [thumb] : [],
    house_image: null,
    product_image: null,
  };
}
