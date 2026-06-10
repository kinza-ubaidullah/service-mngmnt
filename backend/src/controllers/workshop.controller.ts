import type { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { broadcastDataChange } from '../utils/broadcast';
import { WorkshopStatus } from '@prisma/client';

export const getWorkshopJobs = async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    const where: any = {};
    if (status && status !== 'all') where.status = status;

    const jobs = await prisma.workshopJob.findMany({
      where,
      include: {
        lead: {
          include: {
            customer: true,
            technician: { select: { id: true, name: true, phone: true } }
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
      await prisma.lead.update({
        where: { id: updatedJob.lead_id },
        data: { status: 'PendingApproval', pending_outcome: 'WorkshopDelivery' }
      });
      await prisma.jobHistory.create({
        data: {
          lead_id: updatedJob.lead_id,
          action: 'Workshop Delivered - Pending Admin Approval',
          performed_by: user.id,
          old_status: updatedJob.lead.status,
          new_status: 'PendingApproval',
          notes: notes || 'Workshop delivery completed, awaiting admin approval'
        }
      });
    } else if (status === 'Received') {
      await prisma.jobHistory.create({
        data: {
          lead_id: updatedJob.lead_id,
          action: `Workshop: ${status}`,
          performed_by: user.id,
          notes: notes || `Status changed to ${status}`
        }
      });
    }

    broadcastDataChange('workshop', 'update');
    res.json({ message: 'Workshop job updated', job: updatedJob });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update workshop job' });
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
    const jobId = parseInt(id as string);

    const job = await prisma.workshopJob.findUnique({ where: { id: jobId } });
    if (!job) {
      res.status(404).json({ message: 'Workshop job not found' });
      return;
    }

    await prisma.$transaction([
      prisma.workshopJob.delete({ where: { id: jobId } }),
      prisma.lead.update({
        where: { id: job.lead_id },
        data: { status: 'Assigned' }
      })
    ]);

    broadcastDataChange('workshop', 'delete');
    broadcastDataChange('leads', 'update');
    res.json({ message: 'Workshop record removed and lead returned to technician' });
  } catch (error) {
    console.error('Delete workshop job error:', error);
    res.status(500).json({ message: 'Failed to remove workshop record' });
  }
};
