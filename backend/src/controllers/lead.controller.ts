import type { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { generateLeadId } from '../utils/idGenerator';
import { resolveLeadCoords, expandAndParseGoogleMapsUrl } from '../utils/locationResolver';
import { broadcastDataChange } from '../utils/broadcast';
import { liteLeadForList } from '../utils/leadListLite';
import { JobStatus } from '@prisma/client';

type ProductInput = { product_type: string; problem_details?: string | null };

const cleanOptional = (v: unknown) => {
  if (v == null || v === '') return null;
  return v;
};

const LEAD_RELATIONS_BASE = {
  customer: true,
  technician: { select: { id: true, name: true, phone: true } },
  team: { select: { id: true, name: true } },
  workshop_job: true,
};

const LEAD_RELATIONS = {
  ...LEAD_RELATIONS_BASE,
  products: { orderBy: { sort_order: 'asc' as const } },
};

function leadErrorMessage(error: unknown, fallback: string): string {
  const err = error as { code?: string; message?: string; meta?: { field_name?: string } };
  const msg = String(err?.message || '');
  if (err?.code === 'P2000' || msg.includes('Data too long')) {
    return 'Photo or text too large — use smaller images';
  }
  if (err?.code === 'P2021' || msg.includes('lead_products') || msg.includes("doesn't exist")) {
    return 'Database update required — run production-cpanel-update.sql then restart app';
  }
  if (msg.includes('Unknown column') || err?.meta?.field_name) {
    return 'Database columns missing — run production-cpanel-update.sql in phpMyAdmin';
  }
  return fallback;
}

function isSchemaMismatchError(error: unknown): boolean {
  const err = error as { code?: string; message?: string };
  const msg = String(err?.message || '');
  return (
    err?.code === 'P2021' ||
    err?.code === 'P2022' ||
    msg.includes('Unknown column') ||
    msg.includes("doesn't exist") ||
    msg.includes('lead_products') ||
    msg.includes('Invalid value for enum')
  );
}

async function findOpenLeadByPhone(phone: string) {
  const CLOSED = ['Completed', 'Cancelled', 'Deleted'] as const;
  try {
    return await prisma.lead.findFirst({
      where: {
        customer: { phone },
        status: { notIn: [...CLOSED] },
      },
      select: { id: true, lead_id: true, status: true },
    });
  } catch (err) {
    console.warn('[leads] duplicate check fallback:', String((err as Error).message || err).slice(0, 80));
    try {
      const rows = await prisma.$queryRawUnsafe<{ id: number; lead_id: string; status: string }[]>(
        `SELECT l.id, l.lead_id, l.status FROM leads l
         INNER JOIN customers c ON c.id = l.customer_id
         WHERE c.phone = ? AND l.status NOT IN ('Completed','Cancelled','Deleted')
         LIMIT 1`,
        phone
      );
      return rows[0] ?? null;
    } catch {
      return null;
    }
  }
}

async function createLeadRecord(data: Parameters<typeof prisma.lead.create>[0]['data']) {
  try {
    return await prisma.lead.create({ data });
  } catch (err) {
    if (!isSchemaMismatchError(err)) throw err;
    console.warn('[createLead] full create failed, retrying core fields:', String((err as Error).message || err).slice(0, 120));
    const core = {
      lead_id: data.lead_id as string,
      customer_id: data.customer_id as number,
      product_type: data.product_type as string,
      problem_details: (data.problem_details as string | null) ?? null,
      assigned_by: data.assigned_by as number | undefined,
      status: 'New' as const,
    };
    try {
      return await prisma.lead.create({ data: core });
    } catch (err2) {
      if (!isSchemaMismatchError(err2)) throw err2;
      console.warn('[createLead] core create failed, minimal retry');
      return await prisma.lead.create({
        data: {
          lead_id: data.lead_id as string,
          customer_id: data.customer_id as number,
          product_type: data.product_type as string,
          problem_details: (data.problem_details as string | null) ?? null,
          status: 'New',
        },
      });
    }
  }
}

function sanitizeLeadImages(house_image: unknown, item_pictures: unknown) {
  const MAX = 4_000_000;
  const rawHouse = cleanOptional(house_image);
  const houseImg =
    rawHouse && String(rawHouse).length <= MAX ? (String(rawHouse) as string) : null;
  if (rawHouse && String(rawHouse).length > MAX) {
    console.warn('[leads] house_image omitted — exceeds size limit');
  }
  const pictures = Array.isArray(item_pictures)
    ? item_pictures
        .filter((x) => typeof x === 'string' && x.length > 0 && x.length <= MAX)
        .slice(0, 12)
    : [];
  return { houseImg, pictures };
}

async function safeReplaceLeadProducts(leadId: number, products: ProductInput[]) {
  if (products.length === 0) return;
  try {
    await replaceLeadProducts(leadId, products);
  } catch (err: unknown) {
    console.warn(
      '[leads] lead_products save skipped:',
      String((err as Error)?.message || err).slice(0, 120)
    );
  }
}

async function findLeadById(id: number) {
  try {
    return await prisma.lead.findUnique({ where: { id }, include: LEAD_RELATIONS });
  } catch {
    return await prisma.lead.findUnique({ where: { id }, include: LEAD_RELATIONS_BASE });
  }
}

async function findLeadsWithRelations(
  args: Parameters<typeof prisma.lead.findMany>[0]
) {
  try {
    return await prisma.lead.findMany({ ...args, include: LEAD_RELATIONS });
  } catch (err) {
    console.warn('[leads] list without products:', String((err as Error)?.message || err).slice(0, 80));
    return await prisma.lead.findMany({ ...args, include: LEAD_RELATIONS_BASE });
  }
}

function normalizeProducts(body: {
  products?: unknown;
  product_type?: string;
  problem_details?: string;
}): ProductInput[] {
  if (Array.isArray(body.products) && body.products.length > 0) {
    return body.products
      .filter((p: any) => p?.product_type?.trim?.() || (typeof p === 'string' && p.trim()))
      .map((p: any) => {
        if (typeof p === 'string') {
          return { product_type: p.trim(), problem_details: null };
        }
        return {
          product_type: String(p.product_type).trim(),
          problem_details: p.problem_details?.trim?.() || null,
        };
      });
  }
  if (body.product_type?.trim()) {
    return String(body.product_type)
      .split(/[,;|+]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((t, i) => ({
        product_type: t,
        problem_details: i === 0 ? body.problem_details?.trim() || null : null,
      }));
  }
  return [];
}

function productsSummary(products: ProductInput[]): string {
  return products.map((p) => p.product_type).join(', ');
}

async function replaceLeadProducts(leadId: number, products: ProductInput[]) {
  await prisma.leadProduct.deleteMany({ where: { lead_id: leadId } });
  if (products.length === 0) return;
  await prisma.leadProduct.createMany({
    data: products.map((p, i) => ({
      lead_id: leadId,
      product_type: p.product_type,
      problem_details: p.problem_details ?? null,
      sort_order: i,
    })),
  });
}


// Get all leads (with filters)
export const getLeads = async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    
    const filter: any = {};
    if (status) filter.status = status;

    const leads = await findLeadsWithRelations({
      where: filter,
      orderBy: { created_at: 'desc' }
    });

    res.json({ leads: leads.map((l) => liteLeadForList(l as Record<string, unknown>)) });

    // Backfill coords in background — never block the list response
    const needsCoords = leads.filter((l) => l.lat == null || l.lng == null).slice(0, 8);
    if (needsCoords.length > 0) {
      setImmediate(async () => {
        for (const lead of needsCoords) {
          try {
            const areaRecord = lead.customer?.area
              ? await prisma.area.findFirst({ where: { name: lead.customer.area } })
              : null;
            const coords = resolveLeadCoords({
              area: lead.customer?.area,
              google_map_link: lead.customer?.google_map_link,
              exact_address: lead.exact_address || lead.customer?.exact_address,
              areaLat: areaRecord?.lat,
              areaLng: areaRecord?.lng,
            });
            if (coords) {
              await prisma.lead.update({
                where: { id: lead.id },
                data: { lat: coords.lat, lng: coords.lng },
              });
            }
          } catch (err) {
            console.warn('[leads] coord backfill skipped for', lead.id, err);
          }
        }
      });
    }
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ message: 'Failed to fetch leads' });
  }
};

export const resolveLocation = async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    if (!url) {
      res.status(400).json({ message: 'URL is required' });
      return;
    }
    const coords = await expandAndParseGoogleMapsUrl(url);
    if (!coords) {
      res.status(404).json({ message: 'Could not extract coordinates from this link' });
      return;
    }
    res.json({ lat: coords[0], lng: coords[1] });
  } catch (error) {
    console.error('Error resolving location:', error);
    res.status(500).json({ message: 'Failed to resolve location' });
  }
};

// Create a new lead
export const createLead = async (req: Request, res: Response) => {
  try {
    const { 
      customer_name, 
      customer_phone, 
      customer_area, 
      exact_address, 
      google_map_link, 
      product_type, 
      problem_details,
      house_image,
      item_pictures,
      agreed_amount,
      payment_confirmed,
      lat,
      lng,
      products: productsBody,
    } = req.body;

    const user = (req as any).user;
    const products = normalizeProducts({ products: productsBody, product_type, problem_details });

    if (!customer_name?.trim() || !customer_phone?.trim() || !customer_area?.trim() || products.length === 0) {
      res.status(400).json({ message: 'Customer name, phone, area and at least one appliance are required' });
      return;
    }

    const summaryType = productsSummary(products);

    const phone = String(customer_phone).trim();
    const mapLink = cleanOptional(google_map_link) as string | null;
    const address = cleanOptional(exact_address) as string | null;
    const { houseImg, pictures } = sanitizeLeadImages(house_image, item_pictures);

    const existingOpenLead = await findOpenLeadByPhone(phone);
    if (existingOpenLead) {
      res.status(409).json({
        message: `An active lead already exists for this phone (${existingOpenLead.lead_id} — ${existingOpenLead.status}). Complete or cancel it before creating a new one.`,
        existingLead: existingOpenLead,
      });
      return;
    }

    // 1. Find or create customer
    let customer = await prisma.customer.findUnique({
      where: { phone }
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          name: customer_name.trim(),
          phone,
          area: customer_area.trim(),
          exact_address: address,
          google_map_link: mapLink
        }
      });
    } else {
      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          name: customer_name.trim(),
          exact_address: address ?? customer.exact_address,
          area: customer_area.trim(),
          google_map_link: mapLink ?? customer.google_map_link
        }
      });
    }

    // 2. Generate Lead ID
    const leadId = await generateLeadId();

    let activeWarranty: { lead_id: string; warranty_end: Date | null } | null = null;
    try {
      activeWarranty = await prisma.lead.findFirst({
        where: {
          customer_id: customer.id,
          status: 'Completed',
          warranty_end: { gt: new Date() },
        },
        orderBy: { warranty_end: 'desc' },
        select: { lead_id: true, warranty_end: true },
      });
    } catch (err) {
      console.warn('[createLead] warranty check skipped:', String((err as Error).message || err).slice(0, 80));
    }

    const areaRecord = customer_area
      ? await prisma.area.findFirst({ where: { name: customer_area.trim() } })
      : null;
    let coords = resolveLeadCoords({
      lat,
      lng,
      area: customer_area,
      google_map_link: mapLink,
      exact_address: address,
      areaLat: areaRecord?.lat,
      areaLng: areaRecord?.lng,
    });
    if (!coords && mapLink) {
      const expanded = await expandAndParseGoogleMapsUrl(mapLink);
      if (expanded) coords = { lat: expanded[0], lng: expanded[1] };
    }

    const newLead = await createLeadRecord({
      lead_id: leadId,
      customer_id: customer.id,
      product_type: summaryType,
      problem_details: problem_details?.trim() || products[0]?.problem_details || null,
      item_pictures: pictures,
      house_image: houseImg,
      exact_address: address,
      assigned_by: user.id,
      status: 'New',
      is_warranty_claim: !!activeWarranty,
      agreed_amount: agreed_amount && !isNaN(Number(agreed_amount)) ? Number(agreed_amount) : null,
      payment_confirmed: !!payment_confirmed,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
    });

    await safeReplaceLeadProducts(newLead.id, products);

    try {
      await prisma.jobHistory.create({
        data: {
          lead_id: newLead.id,
          action: activeWarranty ? 'Warranty Claim Detected' : 'Lead Created',
          performed_by: user.id,
          new_status: 'New',
          notes: activeWarranty
            ? `Automatic detection: Customer has active warranty from Job ${activeWarranty.lead_id} until ${activeWarranty.warranty_end?.toLocaleDateString()}`
            : `Lead booked for ${summaryType}`,
        },
      });
    } catch (err) {
      console.warn('[createLead] job history skipped:', String((err as Error).message || err).slice(0, 80));
    }

    broadcastDataChange('leads', 'create');
    const fullLead = await findLeadById(newLead.id);
    res.status(201).json({ 
      message: 'Lead created successfully', 
      lead: fullLead ?? newLead 
    });

  } catch (error: unknown) {
    console.error('Error creating lead:', error);
    res.status(500).json({
      message: leadErrorMessage(error, 'Failed to create lead'),
      hint: 'Run production-lead-fix-only.sql in phpMyAdmin, then: npm install && npx prisma generate && node auto-migrate.js && Restart',
      debug: String((error as Error)?.message || error).slice(0, 200),
    });
  }
};

// Update an existing lead (Call Center / Admin)
export const updateLead = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      customer_name, 
      customer_phone, 
      customer_area, 
      exact_address, 
      google_map_link, 
      product_type, 
      problem_details,
      house_image,
      item_pictures,
      lat,
      lng,
      products: productsBody,
    } = req.body;
    const user = (req as any).user;

    const leadId = parseInt(id as string);
    if (isNaN(leadId)) {
      res.status(400).json({ message: 'Invalid lead ID' });
      return;
    }

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { customer: true },
    });
    if (!lead) {
      res.status(404).json({ message: 'Lead not found' });
      return;
    }

    const effectiveArea = customer_area ?? lead.customer.area;
    const effectiveAddress = exact_address ?? lead.exact_address ?? lead.customer.exact_address;
    const effectiveMapLink = google_map_link ?? lead.customer.google_map_link;

    // Handle phone number changes robustly to avoid unique key conflicts
    const existingCustomer = await prisma.customer.findUnique({
      where: { phone: customer_phone }
    });

    let targetCustomerId = lead.customer_id;

    if (existingCustomer && existingCustomer.id !== lead.customer_id) {
      // The phone number belongs to another customer. Swap lead association to that customer.
      await prisma.customer.update({
        where: { id: existingCustomer.id },
        data: {
          name: customer_name,
          area: customer_area,
          exact_address,
          google_map_link
        }
      });
      targetCustomerId = existingCustomer.id;
    } else {
      // Update the current customer's profile
      await prisma.customer.update({
        where: { id: lead.customer_id },
        data: {
          name: customer_name,
          phone: customer_phone,
          area: customer_area,
          exact_address,
          google_map_link
        }
      });
    }

    const areaRecord = effectiveArea
      ? await prisma.area.findFirst({ where: { name: effectiveArea } })
      : null;
    let coords = resolveLeadCoords({
      lat: lat ?? lead.lat,
      lng: lng ?? lead.lng,
      area: effectiveArea,
      google_map_link: effectiveMapLink,
      exact_address: effectiveAddress,
      areaLat: areaRecord?.lat,
      areaLng: areaRecord?.lng,
    });
    if (!coords && effectiveMapLink) {
      const expanded = await expandAndParseGoogleMapsUrl(effectiveMapLink);
      if (expanded) coords = { lat: expanded[0], lng: expanded[1] };
    }

    // Update lead info, including base64 images if provided
    const normalizedProducts = normalizeProducts({ products: productsBody, product_type, problem_details });
    const leadUpdateData: Record<string, unknown> = {
      problem_details,
      exact_address: effectiveAddress,
      customer_id: targetCustomerId,
      ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
      house_image: house_image !== undefined ? house_image : undefined,
      item_pictures: item_pictures !== undefined ? item_pictures : undefined,
    };
    if (normalizedProducts.length > 0) {
      leadUpdateData.product_type = productsSummary(normalizedProducts);
      if (problem_details === undefined && normalizedProducts[0]?.problem_details) {
        leadUpdateData.problem_details = normalizedProducts[0].problem_details;
      }
    } else if (product_type !== undefined) {
      leadUpdateData.product_type = product_type;
    }

    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: leadUpdateData,
    });

    if (normalizedProducts.length > 0) {
      await safeReplaceLeadProducts(leadId, normalizedProducts);
    }

    await prisma.jobHistory.create({
      data: {
        lead_id: leadId,
        action: 'Lead Edited',
        performed_by: user.id,
        notes: 'Updated lead details and images'
      }
    });

    broadcastDataChange('leads', 'update');
    const fullLead = await findLeadById(leadId);
    res.json({ message: 'Lead updated successfully', lead: fullLead ?? updatedLead });
  } catch (error: unknown) {
    console.error('Error updating lead:', error);
    res.status(500).json({
      message: leadErrorMessage(error, 'Failed to update lead'),
      hint: 'Run production-cpanel-update.sql if this persists',
    });
  }
};

// Assign a lead to a technician
export const assignLead = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { technician_id, visit_date } = req.body;
    const user = (req as any).user;

    const leadId = parseInt(id as string);
    if (isNaN(leadId)) {
       res.status(400).json({ message: 'Invalid lead ID' });
       return;
    }

    // Check if lead exists
    const existingLead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!existingLead) {
       res.status(404).json({ message: 'Lead not found' });
       return;
    }

    // Check if technician exists
    const technician = await prisma.user.findUnique({
      where: { id: parseInt(technician_id) }
    });
    if (!technician || technician.role !== 'TECHNICIAN') {
       res.status(400).json({ message: 'Invalid technician selected' });
       return;
    }

    // Update lead
    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: {
        status: 'Assigned',
        assigned_to: technician.id,
        team_id: technician.team_id,
        visit_date: visit_date ? new Date(visit_date) : null,
        assigned_at: new Date()
      }
    });

    // Create Job History Audit
    await prisma.jobHistory.create({
      data: {
        lead_id: leadId,
        action: 'Lead Assigned',
        performed_by: user.id,
        new_status: 'Assigned',
        notes: `Assigned to technician ${technician.name}`
      }
    });

    broadcastDataChange('leads', 'assign');
    res.json({ message: 'Lead assigned successfully', lead: updatedLead });
  } catch (error) {
    console.error('Error assigning lead:', error);
    res.status(500).json({ message: 'Failed to assign lead' });
  }
};

export const unassignLead = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    const leadId = parseInt(id as string);

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: {
        assigned_to: null,
        assigned_at: null,
        visit_date: null,
        team_id: null,
        status: 'New'
      }
    });

    await prisma.jobHistory.create({
      data: {
        lead_id: leadId,
        action: 'Unassigned',
        performed_by: user.id,
        old_status: lead.status,
        new_status: 'New',
        notes: 'Lead unassigned by admin/call center'
      }
    });

    broadcastDataChange('leads', 'unassign');
    res.json({ message: 'Lead unassigned', lead: updatedLead });
  } catch (error) {
    console.error('Error assigning lead:', error);
    res.status(500).json({ message: 'Failed to assign lead' });
  }
};

export const cancelLead = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    const leadId = parseInt(id as string);

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    if (['Completed', 'Cancelled', 'Deleted'].includes(lead.status)) {
      return res.status(400).json({ message: `Cannot cancel a lead with status: ${lead.status}` });
    }

    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: {
        status: 'Cancelled',
        assigned_to: null,
        assigned_at: null,
        visit_date: null,
        team_id: null,
      },
      include: {
        customer: true,
        technician: { select: { id: true, name: true } },
      },
    });

    await prisma.jobHistory.create({
      data: {
        lead_id: leadId,
        action: 'Cancelled',
        performed_by: user.id,
        old_status: lead.status,
        new_status: 'Cancelled',
        notes: 'Lead cancelled by admin/call center',
      },
    });

    broadcastDataChange('leads', 'cancel');
    res.json({ message: 'Lead cancelled', lead: updatedLead });
  } catch (error) {
    console.error('Error cancelling lead:', error);
    res.status(500).json({ message: 'Failed to cancel lead' });
  }
};

/** Technician marks customer unreachable — returns lead to unassigned queue */
export const technicianNoAnswer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const user = (req as any).user;
    const leadId = parseInt(id as string);

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      res.status(404).json({ message: 'Lead not found' });
      return;
    }

    if (user.role !== 'TECHNICIAN' && user.role !== 'ADMIN') {
      res.status(403).json({ message: 'Not authorized' });
      return;
    }

    if (user.role === 'TECHNICIAN' && lead.assigned_to !== user.id) {
      res.status(403).json({ message: 'You can only return your own assigned leads' });
      return;
    }

    if (!['Assigned', 'InProgress', 'Reopened'].includes(lead.status)) {
      res.status(400).json({ message: 'Only active assigned leads can be returned as no-answer' });
      return;
    }

    const note = reason?.trim() || 'Customer did not answer phone — returned to unassigned queue';

    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: {
        status: 'New',
        assigned_to: null,
        assigned_at: null,
        visit_date: null,
        team_id: null,
      },
      include: {
        customer: true,
        technician: { select: { id: true, name: true } },
      },
    });

    await prisma.jobHistory.create({
      data: {
        lead_id: leadId,
        action: 'Customer No Answer — Returned to Unassigned',
        performed_by: user.id,
        old_status: lead.status,
        new_status: 'New',
        notes: note,
      },
    });

    broadcastDataChange('leads', 'no-answer');
    res.json({ message: 'Lead returned to unassigned queue', lead: updatedLead });
  } catch (error) {
    console.error('Error returning lead (no answer):', error);
    res.status(500).json({ message: 'Failed to return lead' });
  }
};

// Get jobs assigned to the logged-in technician
export const getMyJobs = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    const whereClause: any = {};
    if (user.role === 'ADMIN') {
      whereClause.assigned_to = { not: null };
    } else {
      whereClause.assigned_to = user.id;
    }

    const leads = await findLeadsWithRelations({
      where: whereClause,
      orderBy: {
        created_at: 'desc',
      },
    });

    const normalized = leads.map((lead) => {
      let pics: string[] = [];
      if (Array.isArray(lead.item_pictures)) pics = lead.item_pictures as string[];
      else if (lead.item_pictures && typeof lead.item_pictures === 'string') {
        try { pics = JSON.parse(lead.item_pictures); } catch { pics = []; }
      }
      return { ...lead, item_pictures: pics };
    });

    res.json({ leads: normalized });
  } catch (error) {
    console.error('Error fetching technician jobs:', error);
    res.status(500).json({ message: 'Failed to fetch jobs' });
  }
};

// Update lead outcome (Technician action)
export const updateLeadOutcome = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      status,
      actual_problem,
      repair_details,
      total_amount,
      collected_amount,
      warranty_months,
      item_pictures,
      voice_note
    } = req.body;
    const user = (req as any).user;

    const leadId = parseInt(id as string);
    if (isNaN(leadId)) {
      res.status(400).json({ message: 'Invalid lead ID' });
      return;
    }

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      res.status(404).json({ message: 'Lead not found' });
      return;
    }

    // Security: Only the assigned technician or admin can update
    if (user.role !== 'ADMIN' && lead.assigned_to !== user.id) {
      res.status(403).json({ message: 'Unauthorized to update this lead' });
      return;
    }

    const VALID_OUTCOMES: JobStatus[] = ['Completed', 'InspectionCompleted', 'PickedForWorkshop'];
    if (!VALID_OUTCOMES.includes(status as JobStatus)) {
      res.status(400).json({ message: `Invalid outcome status: ${status}` });
      return;
    }

    let finalStatus = status as JobStatus;
    let pendingOutcome: string | null = null;

    if (user.role !== 'ADMIN') {
      if (status === 'Completed' || status === 'InspectionCompleted') {
        pendingOutcome = status;
        finalStatus = 'PendingApproval';
      } else if (status === 'PickedForWorkshop') {
        finalStatus = 'PendingApproval';
        pendingOutcome = 'PickedForWorkshop';
      }
    }

    const isCompletedOutcome = status === 'Completed';
    const isInspectionOutcome = status === 'InspectionCompleted';
    const isPickupOutcome = status === 'PickedForWorkshop';

    const stripForLog = (obj: any) => {
      if (!obj) return obj;
      const copy = { ...obj };
      if (copy.item_pictures) copy.item_pictures = `[${Array.isArray(copy.item_pictures) ? copy.item_pictures.length : 0} images]`;
      if (copy.house_image) copy.house_image = '[image]';
      if (copy.product_image) copy.product_image = '[image]';
      if (copy.voice_note) copy.voice_note = '[voice]';
      return copy;
    };

    const pictureUpdate: any = {};
    if (item_pictures !== undefined && Array.isArray(item_pictures) && item_pictures.length > 0) {
      let existing: string[] = [];
      if (Array.isArray(lead.item_pictures)) existing = lead.item_pictures as string[];
      else if (typeof lead.item_pictures === 'string') {
        try { existing = JSON.parse(lead.item_pictures); } catch { existing = []; }
      }
      const incoming = item_pictures.slice(0, 6).filter((p: unknown) => typeof p === 'string' && p.length < 800000);
      pictureUpdate.item_pictures = [...existing, ...incoming].slice(-12);
    }

    const safeVoiceNote = (voice_note && typeof voice_note === 'string' && voice_note.length < 800000)
      ? voice_note : null;

    const parsedTotal = (total_amount !== undefined && total_amount !== '' && !isNaN(Number(total_amount)))
      ? Number(total_amount) : null;
    const parsedCollected = (collected_amount !== undefined && collected_amount !== '' && !isNaN(Number(collected_amount)))
      ? Number(collected_amount) : null;
    const parsedWarranty = (warranty_months !== undefined && warranty_months !== '' && !isNaN(Number(warranty_months)))
      ? Number(warranty_months) : (isCompletedOutcome ? 1 : 0);

    const amountData: Record<string, number | null> = {
      total_amount: parsedTotal ?? parsedCollected,
      collected_amount: parsedCollected ?? parsedTotal ?? 0,
    };
    if (isPickupOutcome && parsedTotal != null) {
      amountData.agreed_amount = parsedTotal;
    }

    const applyWarranty = isCompletedOutcome && (finalStatus === 'Completed' || finalStatus === 'PendingApproval');
    const warrantyEnd = applyWarranty && parsedWarranty > 0
      ? new Date(new Date().setMonth(new Date().getMonth() + parsedWarranty))
      : null;

    // Update Lead
    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: {
        status: finalStatus,
        actual_problem: actual_problem || null,
        repair_details: repair_details || null,
        ...amountData,
        warranty_months: isInspectionOutcome ? 0 : parsedWarranty,
        warranty_start: applyWarranty ? new Date() : null,
        warranty_end: warrantyEnd,
        pending_outcome: pendingOutcome,
        rejection_note: null,
        voice_note: safeVoiceNote,
        ...pictureUpdate,
      },
      include: {
        customer: true,
        technician: { select: { name: true } }
      }
    });

    // Audit Log
    await prisma.jobHistory.create({
      data: {
        lead_id: leadId,
        action: `Outcome: ${status}`,
        performed_by: user.id,
        old_status: lead.status,
        new_status: finalStatus,
        notes: repair_details,
      },
    });

    try {
      await prisma.systemLog.create({
        data: {
          user_id: user.id,
          user_name: user.name,
          action_type: 'UPDATE',
          module: 'Leads',
          old_value: stripForLog(lead) as any,
          new_value: stripForLog(updatedLead) as any,
          panel: user.role === 'ADMIN' ? 'Admin Panel' : 'Technician Panel'
        }
      });
    } catch (logErr) {
      console.warn('System log skipped:', logErr);
    }

    // If pickup outcome, ensure WorkshopJob entry is WaitingForApproval
    if (isPickupOutcome) {
      await prisma.workshopJob.upsert({
        where: { lead_id: leadId },
        update: {
          status: 'WaitingForApproval',
          agreed_parts: repair_details || null,
        },
        create: {
          lead_id: leadId,
          received_by: user.id,
          status: 'WaitingForApproval',
          agreed_parts: repair_details || null,
        },
      });
    }

    broadcastDataChange('leads', 'outcome');
    broadcastDataChange('workshop', 'outcome');
    res.json({ message: 'Job status updated', lead: updatedLead });
  } catch (error: any) {
    console.error('Error updating job outcome:', error);
    res.status(500).json({
      message: 'Failed to update job outcome',
      error: error?.message || 'Unknown error',
    });
  }
};
  
// Reopen a completed lead (Complaint handling)
export const reopenLead = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const user = (req as any).user;

    const leadId = parseInt(id as string);
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });

    if (!lead || !['Completed', 'InspectionCompleted'].includes(lead.status)) {
      res.status(400).json({ message: 'Only completed jobs can be reopened as complaints' });
      return;
    }

    const { technician_id } = req.body;
    const updateData: any = {
      status: 'Complaint',
      problem_details: `${lead.problem_details || ''}\n\n[COMPLAINT: ${reason}]`,
      pending_outcome: null,
      rejection_note: null,
    };
    if (technician_id) {
      updateData.assigned_to = Number(technician_id);
      updateData.assigned_at = new Date();
    }

    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: updateData,
      include: { customer: true, technician: { select: { id: true, name: true } } },
    });

    await prisma.jobHistory.create({
      data: {
        lead_id: leadId,
        action: technician_id ? 'Complaint Reassigned' : 'Job Reopened as Complaint',
        performed_by: user.id,
        old_status: lead.status,
        new_status: 'Complaint',
        notes: reason
      }
    });

    broadcastDataChange('leads', 'reopen');
    res.json({ message: 'Job reopened successfully', lead: updatedLead });
  } catch (error) {
    console.error('Error reopening lead:', error);
    res.status(500).json({ message: 'Failed to reopen job' });
  }
};

// Admin approves a PendingApproval lead
export const approveLead = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    const leadId = parseInt(id as string);
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });

    if (!lead || lead.status !== 'PendingApproval') {
      res.status(400).json({ message: 'Lead is not pending approval' });
      return;
    }

    let approvedStatus: JobStatus = 'Completed';
    if (lead.pending_outcome === 'InspectionCompleted') approvedStatus = 'InspectionCompleted';
    else if (lead.pending_outcome === 'WorkshopDelivery') approvedStatus = 'Completed';
    else if (lead.pending_outcome === 'PickedForWorkshop') approvedStatus = 'PickedForWorkshop';

    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: {
        status: approvedStatus,
        pending_outcome: null,
        rejection_note: null,
      }
    });

    await prisma.jobHistory.create({
      data: {
        lead_id: leadId,
        action: 'Admin Approved',
        performed_by: user.id,
        old_status: 'PendingApproval',
        new_status: approvedStatus,
        notes: `Admin verified and approved (${lead.pending_outcome || 'Completed'}).`
      }
    });

    broadcastDataChange('leads', 'approve');
    res.json({ message: 'Job approved successfully', lead: updatedLead });
  } catch (error) {
    console.error('Error approving lead:', error);
    res.status(500).json({ message: 'Failed to approve job' });
  }
};

// Admin rejects a PendingApproval lead — returns to technician for correction
export const rejectPendingLead = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const user = (req as any).user;

    const leadId = parseInt(id as string);
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });

    if (!lead || lead.status !== 'PendingApproval') {
      res.status(400).json({ message: 'Lead is not pending approval' });
      return;
    }

    const note = reason?.trim() || `Rejected pending approval (${lead.pending_outcome || 'Completed'}).`;

    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: {
        status: 'Reopened',
        rejection_note: note,
        // Keep pending_outcome + submitted fields so technician can resubmit
      },
      include: {
        customer: true,
        technician: { select: { id: true, name: true, phone: true } },
      },
    });

    await prisma.jobHistory.create({
      data: {
        lead_id: leadId,
        action: 'Admin Rejected — Returned to Technician',
        performed_by: user.id,
        old_status: 'PendingApproval',
        new_status: 'Reopened',
        notes: note,
      },
    });

    broadcastDataChange('leads', 'reject');
    res.json({ message: 'Job rejected and returned to technician', lead: updatedLead });
  } catch (error) {
    console.error('Error rejecting lead:', error);
    res.status(500).json({ message: 'Failed to reject job' });
  }
};

// Lookup customer by phone for repeat insights
export const lookupCustomer = async (req: Request, res: Response) => {
  try {
    const { phone } = req.query;
    if (!phone) {
        res.status(400).json({ message: 'Phone is required' });
        return;
    }

    const customer = await prisma.customer.findUnique({
      where: { phone: phone as string },
      include: {
        leads: {
          orderBy: { created_at: 'desc' },
          select: {
            id: true,
            lead_id: true,
            status: true,
            product_type: true,
            problem_details: true,
            collected_amount: true,
            agreed_amount: true,
            created_at: true,
            completed_at: true,
          }
        }
      }
    });

    if (!customer) {
      res.json({ found: false });
      return;
    }

    const jobCount = customer.leads.length;
    const totalSpent = customer.leads.reduce((sum, lead) => sum + Number(lead.collected_amount || 0), 0);
    const lastJob = customer.leads[0];

    res.json({
      found: true,
      customer: {
        name: customer.name,
        area: customer.area,
        address: customer.exact_address,
        google_map_link: customer.google_map_link,
      },
      history: customer.leads,
      stats: {
        jobCount,
        totalSpent,
        lastJobDate: lastJob?.created_at,
        lastJobStatus: lastJob?.status
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Lookup failed' });
  }
};

export const getLeadHistory = async (req: Request, res: Response) => {
  try {
    const leadId = parseInt(req.params.id as string);
    let lead;
    try {
      lead = await prisma.lead.findUnique({
        where: { id: leadId },
        include: {
          ...LEAD_RELATIONS,
          history: { orderBy: { timestamp: 'desc' } },
        },
      });
    } catch {
      lead = await prisma.lead.findUnique({
        where: { id: leadId },
        include: {
          ...LEAD_RELATIONS_BASE,
          history: { orderBy: { timestamp: 'desc' } },
        },
      });
    }
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    res.json({ lead, history: lead.history });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch lead history' });
  }
};

// Delete a lead (Soft Delete to Bin, only allowed for unassigned leads)
export const deleteLead = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const leadId = parseInt(id as string);
    const user = (req as any).user;
    
    if (isNaN(leadId)) {
      res.status(400).json({ message: 'Invalid lead ID' });
      return;
    }

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      res.status(404).json({ message: 'Lead not found' });
      return;
    }

    // Only allow deletion of unassigned leads (status === 'New')
    if (lead.status !== 'New') {
      res.status(400).json({ 
        message: 'Only unassigned leads can be deleted. This lead has active work or has been dispatched.' 
      });
      return;
    }

    const fullLead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        customer: { select: { id: true, name: true, phone: true, area: true } },
        technician: { select: { id: true, name: true } }
      }
    });

    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: { status: 'Deleted' }
    });

    try {
      await prisma.trash.create({
        data: {
          model_name: 'Lead',
          record_id: leadId,
          data: {
            id: leadId,
            lead_id: fullLead?.lead_id || lead.lead_id,
            old_status: lead.status,
            customer_name: fullLead?.customer?.name,
            product_type: fullLead?.product_type,
            phone: fullLead?.customer?.phone,
          },
          deleted_by: user.id
        }
      });
    } catch (trashErr) {
      console.warn('Trash record skipped:', trashErr);
    }

    try {
      await prisma.jobHistory.create({
        data: {
          lead_id: leadId,
          action: 'Lead Deleted (Bin)',
          performed_by: user.id,
          old_status: lead.status,
          new_status: 'Deleted',
          notes: 'Moved lead to trash/bin'
        }
      });
    } catch (histErr) {
      console.warn('Job history skipped:', histErr);
    }

    try {
      await prisma.systemLog.create({
        data: {
          user_id: user.id,
          user_name: user.name,
          action_type: 'DELETE_TO_TRASH',
          module: 'Lead',
          old_value: { lead_id: lead.lead_id, status: lead.status } as any,
          new_value: { status: 'Deleted' } as any,
          panel: user.role === 'CALL_CENTER' ? 'Call Center Panel' : 'Admin Panel'
        }
      });
    } catch (logErr) {
      console.warn('System log skipped:', logErr);
    }

    broadcastDataChange('leads', 'delete');
    broadcastDataChange('system', 'delete');
    res.json({ message: 'Lead moved to Bin successfully', lead: updatedLead });
  } catch (error: any) {
    console.error('Delete lead CRITICAL error:', error);
    res.status(500).json({ message: 'Failed to delete lead', error: error.message });
  }
};
