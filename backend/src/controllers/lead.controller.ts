import type { Request, Response } from 'express';
import { prisma } from '../utils/prisma.js';
import { generateLeadId } from '../utils/idGenerator.js';
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

    res.json({ leads });
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ message: 'Failed to fetch leads' });
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
      problem_details 
    } = req.body;

    const user = (req as any).user;

    // 1. Find or create customer
    let customer = await prisma.customer.findUnique({
      where: { phone: customer_phone }
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          name: customer_name,
          phone: customer_phone,
          area: customer_area,
          exact_address,
          google_map_link
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

    // 4. Create the Lead
    const newLead = await prisma.lead.create({
      data: {
        lead_id: leadId,
        customer_id: customer.id,
        product_type,
        problem_details,
        assigned_by: user.id, // Who created it
        status: 'New',
        is_warranty_claim: !!activeWarranty
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

    res.status(201).json({ 
      message: 'Lead created successfully', 
      lead: newLead 
    });

  } catch (error) {
    console.error('Error creating lead:', error);
    res.status(500).json({ message: 'Failed to create lead' });
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

    res.json({ message: 'Lead assigned successfully', lead: updatedLead });
  } catch (error) {
    console.error('Error assigning lead:', error);
    res.status(500).json({ message: 'Failed to assign lead' });
  }
};

// Get jobs assigned to the logged-in technician
export const getMyJobs = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    const leads = await prisma.lead.findMany({
      where: {
        assigned_to: user.id,
      },
      include: {
        customer: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    res.json({ leads });
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
      warranty_months
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

    // Update Lead
    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: {
        status: status as JobStatus,
        actual_problem: actual_problem || null,
        repair_details: repair_details || null,
        total_amount: (total_amount && !isNaN(Number(total_amount))) ? Number(total_amount) : null,
        collected_amount: (collected_amount && !isNaN(Number(collected_amount))) ? Number(collected_amount) : null,
        warranty_months: (warranty_months && !isNaN(Number(warranty_months))) ? Number(warranty_months) : 1,
        // If status is Completed, set warranty dates
        warranty_start: status === 'Completed' ? new Date() : null,
        warranty_end: (status === 'Completed' && warranty_months && !isNaN(Number(warranty_months)))
          ? new Date(new Date().setMonth(new Date().getMonth() + Number(warranty_months))) 
          : null,
      },
    });

    // Audit Log
    await prisma.jobHistory.create({
      data: {
        lead_id: leadId,
        action: `Outcome: ${status}`,
        performed_by: user.id,
        old_status: lead.status,
        new_status: status as JobStatus,
        notes: repair_details,
      },
    });

    // If status is PickedForWorkshop, ensure WorkshopJob entry
    if (status === 'PickedForWorkshop') {
      await prisma.workshopJob.upsert({
        where: { lead_id: leadId },
        update: {
          status: 'Received',
        },
        create: {
          lead_id: leadId,
          received_by: user.id,
          status: 'Received',
        },
      });
    }

    res.json({ message: 'Job status updated', lead: updatedLead });
  } catch (error) {
    console.error('Error updating job outcome:', error);
    res.status(500).json({ message: 'Failed to update job outcome' });
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

    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: {
        status: 'Reopened',
        problem_details: `${lead.problem_details}\n\n[REOPENED: ${reason}]`,
      }
    });

    await prisma.jobHistory.create({
      data: {
        lead_id: leadId,
        action: 'Job Reopened',
        performed_by: user.id,
        old_status: 'Completed',
        new_status: 'Reopened',
        notes: reason
      }
    });

    res.json({ message: 'Job reopened successfully', lead: updatedLead });
  } catch (error) {
    console.error('Error reopening lead:', error);
    res.status(500).json({ message: 'Failed to reopen job' });
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

// Delete a lead (Admin only)
export const deleteLead = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const leadId = parseInt(id as string);
    
    if (isNaN(leadId)) {
      res.status(400).json({ message: 'Invalid lead ID' });
      return;
    }

    console.log('Admin deleting lead:', leadId);

    // Delete all dependent records
    await prisma.jobHistory.deleteMany({ where: { lead_id: leadId } });
    await prisma.workshopJob.deleteMany({ where: { lead_id: leadId } });
    await prisma.expense.deleteMany({ where: { lead_id: leadId } });
    
    // Now delete the lead
    await prisma.lead.delete({ where: { id: leadId } });
    
    res.json({ message: 'Lead deleted successfully' });
  } catch (error: any) {
    console.error('Delete lead CRITICAL error:', error);
    res.status(500).json({ message: 'Failed to delete lead', error: error.message });
  }
};
