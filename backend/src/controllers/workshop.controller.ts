import type { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { broadcastDataChange } from '../utils/broadcast';
import { WorkshopStatus } from '@prisma/client';

const WORKSHOP_MANAGER_ROLES = ['ADMIN', 'WORKSHOP_MANAGER', 'CALL_CENTER'];
const DELIVER_ROLES = ['ADMIN', 'WORKSHOP_MANAGER', 'CALL_CENTER', 'TECHNICIAN'];

export const getWorkshopJobs = async (req: Request, res: Response) => {
  try {
    const { status, scope } = req.query;
    const user = (req as any).user;
    const where: any = {};

    if (user.role === 'TECHNICIAN') {
      if (scope === 'delivery') {
        where.delivery_assigned_to = user.id;
        if (!status || status === 'all') where.status = 'Ready';
        else where.status = status;
      } else {
        where.OR = [
          { received_by: user.id },
          { delivered_by: user.id },
          { delivery_assigned_to: user.id },
          { lead: { assigned_to: user.id } },
        ];
        if (status && status !== 'all') where.status = status;
      }
    } else if (status && status !== 'all') {
      where.status = status;
    }

    const jobs = await prisma.workshopJob.findMany({
      where,
      include: {
        lead: {
          include: {
            customer: true,
            technician: { select: { id: true, name: true, phone: true } },
            team: { select: { id: true, name: true } },
          }
        }
      },
      orderBy: { received_date: 'desc' }
    });
    res.json({ jobs });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching workshop jobs' });
  }
};

export const updateWorkshopStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const user = (req as any).user;
    const jobId = parseInt(id as string);

    if (!Object.values(WorkshopStatus).includes(status)) {
      res.status(400).json({ message: 'Invalid status' });
      return;
    }

    const existingJob = await prisma.workshopJob.findUnique({
      where: { id: jobId },
      include: { lead: true },
    });

    if (!existingJob) {
      res.status(404).json({ message: 'Workshop job not found' });
      return;
    }

    if (user.role === 'TECHNICIAN') {
      if (status !== 'Delivered') {
        res.status(403).json({ message: 'Technicians can only mark ready jobs as delivered' });
        return;
      }
      if (existingJob.status !== 'Ready') {
        res.status(400).json({ message: 'Job must be Ready before it can be delivered' });
        return;
      }
      const canDeliver =
        existingJob.delivery_assigned_to === user.id ||
        existingJob.received_by === user.id ||
        existingJob.lead.assigned_to === user.id;
      if (!canDeliver) {
        res.status(403).json({ message: 'You are not assigned to deliver this job' });
        return;
      }
    }

    const dataToUpdate: any = { status };
    if (notes) dataToUpdate.notes = notes;
    if (status === 'Delivered') {
      dataToUpdate.delivered_at = new Date();
      dataToUpdate.delivered_by = user.id;
    }

    const updatedJob = await prisma.workshopJob.update({
      where: { id: jobId },
      data: dataToUpdate,
      include: { lead: { include: { customer: true, technician: true } } }
    });

    if (status === 'Delivered') {
      const oldLeadStatus = existingJob.lead.status;
      await prisma.lead.update({
        where: { id: updatedJob.lead_id },
        data: { status: 'PendingApproval', pending_outcome: 'WorkshopDelivery' }
      });
      await prisma.jobHistory.create({
        data: {
          lead_id: updatedJob.lead_id,
          action: 'Workshop Delivered - Pending Admin Approval',
          performed_by: user.id,
          old_status: oldLeadStatus,
          new_status: 'PendingApproval',
          notes: notes || 'Workshop delivery completed, awaiting admin approval'
        }
      });
    } else {
      await prisma.jobHistory.create({
        data: {
          lead_id: updatedJob.lead_id,
          action: `Workshop: ${status}`,
          performed_by: user.id,
          notes: notes || `Workshop status changed to ${status}`
        }
      });
    }

    broadcastDataChange('workshop', 'update');
    broadcastDataChange('leads', 'update');
    res.json({ message: 'Workshop job updated', job: updatedJob });
  } catch (error: any) {
    console.error('Workshop status update error:', error);
    res.status(500).json({ message: 'Failed to update workshop job', error: error?.message });
  }
};

export const updateWorkshopParts = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { additional_parts } = req.body;
    const user = (req as any).user;
    const jobId = parseInt(id as string);

    if (!WORKSHOP_MANAGER_ROLES.includes(user.role)) {
      res.status(403).json({ message: 'Only workshop staff can add additional parts' });
      return;
    }

    if (!additional_parts || !String(additional_parts).trim()) {
      res.status(400).json({ message: 'Additional parts description is required' });
      return;
    }

    const job = await prisma.workshopJob.findUnique({ where: { id: jobId } });
    if (!job) {
      res.status(404).json({ message: 'Workshop job not found' });
      return;
    }

    const stamp = new Date().toLocaleString('en-GB');
    const entry = `[${stamp} — ${user.name}]\n${String(additional_parts).trim()}`;
    const merged = job.additional_parts
      ? `${job.additional_parts}\n\n---\n\n${entry}`
      : entry;

    const updated = await prisma.workshopJob.update({
      where: { id: jobId },
      data: { additional_parts: merged },
      include: { lead: { include: { customer: true, technician: true } } }
    });

    await prisma.jobHistory.create({
      data: {
        lead_id: job.lead_id,
        action: 'Workshop: Additional Parts Added',
        performed_by: user.id,
        notes: String(additional_parts).trim(),
      }
    });

    broadcastDataChange('workshop', 'update');
    res.json({ message: 'Additional parts saved', job: updated });
  } catch (error: any) {
    console.error('Workshop parts update error:', error);
    res.status(500).json({ message: 'Failed to save parts', error: error?.message });
  }
};

export const updateWorkshopPartsMedia = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { items } = req.body;
    const user = (req as any).user;
    const jobId = parseInt(id as string);

    if (!WORKSHOP_MANAGER_ROLES.includes(user.role)) {
      res.status(403).json({ message: 'Only workshop staff can upload parts media' });
      return;
    }

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ message: 'At least one media item is required' });
      return;
    }

    const job = await prisma.workshopJob.findUnique({ where: { id: jobId } });
    if (!job) {
      res.status(404).json({ message: 'Workshop job not found' });
      return;
    }

    const existing = Array.isArray(job.parts_media) ? (job.parts_media as any[]) : [];
    const sanitized = items
      .filter((item: any) => item?.src && typeof item.src === 'string')
      .map((item: any) => ({
        id: item.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: item.type === 'video' ? 'video' : 'image',
        src: item.src,
        caption: item.caption ? String(item.caption).slice(0, 200) : '',
        uploadedAt: new Date().toISOString(),
        uploadedBy: user.name,
      }))
      .slice(0, 10);

    if (sanitized.length === 0) {
      res.status(400).json({ message: 'Invalid media payload' });
      return;
    }

    const merged = [...existing, ...sanitized].slice(-30);

    const updated = await prisma.workshopJob.update({
      where: { id: jobId },
      data: { parts_media: merged },
      include: { lead: { include: { customer: true, technician: true } } },
    });

    await prisma.jobHistory.create({
      data: {
        lead_id: job.lead_id,
        action: 'Workshop: Parts Media Uploaded',
        performed_by: user.id,
        notes: `${sanitized.length} file(s) added`,
      },
    });

    broadcastDataChange('workshop', 'update');
    res.json({ message: 'Parts media saved', job: updated });
  } catch (error: any) {
    console.error('Workshop parts media error:', error);
    res.status(500).json({ message: 'Failed to save parts media', error: error?.message });
  }
};

export const assignDeliveryTechnician = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { technician_id } = req.body;
    const jobId = parseInt(id as string);

    const technician = await prisma.user.findUnique({ where: { id: Number(technician_id) } });
    if (!technician || technician.role !== 'TECHNICIAN') {
      return res.status(400).json({ message: 'Invalid technician' });
    }

    const job = await prisma.workshopJob.update({
      where: { id: jobId },
      data: {
        delivery_assigned_to: technician.id,
        delivery_assigned_at: new Date(),
        status: 'Ready'
      },
      include: { lead: { include: { customer: true, technician: true } } }
    });

    await prisma.lead.update({
      where: { id: job.lead_id },
      data: { assigned_to: technician.id, status: 'Assigned' }
    });

    await prisma.jobHistory.create({
      data: {
        lead_id: job.lead_id,
        action: 'Delivery Reassigned',
        performed_by: (req as any).user.id,
        notes: `Delivery assigned to ${technician.name}`
      }
    });

    broadcastDataChange('workshop', 'assign');
    broadcastDataChange('leads', 'assign');
    res.json({ message: 'Delivery technician assigned', job });
  } catch (error) {
    res.status(500).json({ message: 'Failed to assign delivery' });
  }
};

export const deleteWorkshopJob = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { notes } = req.body || {};
    const jobId = parseInt(id as string);

    const job = await prisma.workshopJob.findUnique({ where: { id: jobId } });
    if (!job) {
      res.status(404).json({ message: 'Workshop job not found' });
      return;
    }

    const rejectionNote = notes?.trim() || 'Rejected at workshop gate-in — returned to technician';

    await prisma.$transaction([
      prisma.workshopJob.delete({ where: { id: jobId } }),
      prisma.lead.update({
        where: { id: job.lead_id },
        data: {
          status: 'Reopened',
          pending_outcome: null,
          rejection_note: rejectionNote,
        },
      }),
    ]);

    await prisma.jobHistory.create({
      data: {
        lead_id: job.lead_id,
        action: 'Workshop Pickup Rejected — Returned to Technician',
        performed_by: (req as any).user?.id,
        old_status: 'PickedForWorkshop',
        new_status: 'Reopened',
        notes: rejectionNote,
      },
    });

    broadcastDataChange('workshop', 'delete');
    broadcastDataChange('leads', 'update');
    res.json({ message: 'Workshop record removed and lead returned to technician' });
  } catch (error) {
    console.error('Delete workshop job error:', error);
    res.status(500).json({ message: 'Failed to remove workshop record' });
  }
};
