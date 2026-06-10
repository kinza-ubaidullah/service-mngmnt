import type { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { generateLeadId } from '../utils/idGenerator';
import { resolveLeadCoords, expandAndParseGoogleMapsUrl } from '../utils/locationResolver';
import { broadcastDataChange } from '../utils/broadcast';
import { JobStatus } from '@prisma/client';

// Get all leads (with filters)
export const getLeads = async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    
    const filter: any = {};
    if (status) filter.status = status;

    const leads = await prisma.lead.findMany({
      where: filter,
      include: {
        customer: true,
        technician: {
          select: { id: true, name: true }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    // Backfill missing coordinates for existing leads
    await Promise.all(leads.map(async (lead) => {
      if (lead.lat != null && lead.lng != null) return;
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
          data: { lat: coords.lat, lng: coords.lng }
        });
        lead.lat = coords.lat;
        lead.lng = coords.lng;
      }
    }));

    res.json({ leads });
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

const cleanOptional = (v: unknown) => {
  if (v == null || v === '') return null;
  return v;
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
    } = req.body;

    const user = (req as any).user;

    if (!customer_name?.trim() || !customer_phone?.trim() || !customer_area?.trim() || !product_type?.trim()) {
      res.status(400).json({ message: 'Customer name, phone, area and appliance type are required' });
      return;
    }

    const phone = String(customer_phone).trim();
    const mapLink = cleanOptional(google_map_link) as string | null;
    const address = cleanOptional(exact_address) as string | null;
    const houseImg = cleanOptional(house_image) as string | null;
    const pictures = Array.isArray(item_pictures) ? item_pictures.filter(Boolean) : [];

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

    // 3. Auto-detect Active Warranty
    const activeWarranty = await prisma.lead.findFirst({
      where: {
        customer_id: customer.id,
        status: 'Completed',
        warranty_end: { gt: new Date() }
      },
      orderBy: { warranty_end: 'desc' }
    });

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

    // 4. Create the Lead
    const newLead = await prisma.lead.create({
      data: {
        lead_id: leadId,
        customer_id: customer.id,
        product_type: product_type.trim(),
        problem_details: problem_details?.trim() || null,
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
      }
    });

    // 5. Create Job History Audit
    await prisma.jobHistory.create({
      data: {
        lead_id: newLead.id,
        action: activeWarranty ? 'Warranty Claim Detected' : 'Lead Created',
        performed_by: user.id,
        new_status: 'New',
        notes: activeWarranty 
          ? `Automatic detection: Customer has active warranty from Job ${activeWarranty.lead_id} until ${activeWarranty.warranty_end?.toLocaleDateString()}`
          : `Lead booked for ${product_type}`
      }
    });

    broadcastDataChange('leads', 'create');
    res.status(201).json({ 
      message: 'Lead created successfully', 
      lead: newLead 
    });

  } catch (error: any) {
    console.error('Error creating lead:', error);
    const msg = error?.code === 'P2000'
      ? 'Data too large — try smaller images or a shorter map link'
      : error?.meta?.field_name
        ? `Database field error (${error.meta.field_name}) — run fix-image-columns.sql`
        : 'Failed to create lead';
    res.status(500).json({ message: msg, detail: process.env.NODE_ENV !== 'production' ? String(error?.message || error) : undefined });
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
    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: {
        product_type,
        problem_details,
        exact_address: effectiveAddress,
        customer_id: targetCustomerId,
        ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
        house_image: house_image !== undefined ? house_image : undefined,
        item_pictures: item_pictures !== undefined ? item_pictures : undefined
      },
      include: {
        customer: true,
        technician: { select: { id: true, name: true } }
      }
    });

    await prisma.jobHistory.create({
      data: {
        lead_id: leadId,
        action: 'Lead Edited',
        performed_by: user.id,
        notes: 'Updated lead details and images'
      }
    });

    broadcastDataChange('leads', 'update');
    res.json({ message: 'Lead updated successfully', lead: updatedLead });
  } catch (error: any) {
    console.error('Error updating lead:', error);
    res.status(500).json({ message: 'Failed to update lead', error: error.message });
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

    const leads = await prisma.lead.findMany({
      where: whereClause,
      include: {
        customer: true,
      },
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

    let finalStatus = status as JobStatus;
    let pendingOutcome: string | null = null;

    if (user.role !== 'ADMIN') {
      if (status === 'Completed' || status === 'InspectionCompleted') {
        pendingOutcome = status;
        finalStatus = 'PendingApproval';
      }
    }

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

    // Update Lead
    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: {
        status: finalStatus,
        actual_problem: actual_problem || null,
        repair_details: repair_details || null,
        total_amount: (total_amount !== undefined && total_amount !== '' && !isNaN(Number(total_amount))) ? Number(total_amount) : null,
        collected_amount: (collected_amount !== undefined && collected_amount !== '' && !isNaN(Number(collected_amount))) ? Number(collected_amount) : null,
        warranty_months: (warranty_months !== undefined && warranty_months !== '' && !isNaN(Number(warranty_months))) ? Number(warranty_months) : 1,
        warranty_start: (finalStatus === 'Completed' || finalStatus === 'PendingApproval') ? new Date() : null,
        warranty_end: ((finalStatus === 'Completed' || finalStatus === 'PendingApproval') && warranty_months && !isNaN(Number(warranty_months)))
          ? new Date(new Date().setMonth(new Date().getMonth() + Number(warranty_months)))
          : null,
        pending_outcome: pendingOutcome,
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

    // If status is PickedForWorkshop, ensure WorkshopJob entry is WaitingForApproval
    if (status === 'PickedForWorkshop') {
      await prisma.workshopJob.upsert({
        where: { lead_id: leadId },
        update: {
          status: 'WaitingForApproval',
        },
        create: {
          lead_id: leadId,
          received_by: user.id,
          status: 'WaitingForApproval',
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

    if (!lead || lead.status !== 'Completed') {
      res.status(400).json({ message: 'Only completed jobs can be reopened' });
      return;
    }

    const { technician_id } = req.body;
    const updateData: any = {
      status: 'Complaint',
      problem_details: `${lead.problem_details || ''}\n\n[COMPLAINT: ${reason}]`,
      pending_outcome: null,
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
        old_status: 'Completed',
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

    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: {
        status: approvedStatus,
        pending_outcome: null
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
            lead_id: true,
            status: true,
            collected_amount: true,
            created_at: true
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
      },
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
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        customer: true,
        technician: { select: { id: true, name: true, phone: true } },
        history: { orderBy: { timestamp: 'desc' } },
        workshop_job: true
      }
    });
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
    }).catch(() => {});

    broadcastDataChange('leads', 'delete');
    broadcastDataChange('system', 'delete');
    res.json({ message: 'Lead moved to Bin successfully', lead: updatedLead });
  } catch (error: any) {
    console.error('Delete lead CRITICAL error:', error);
    res.status(500).json({ message: 'Failed to delete lead', error: error.message });
  }
};
