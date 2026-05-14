import type { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { WorkshopStatus } from '@prisma/client';

export const getWorkshopJobs = async (req: Request, res: Response) => {
  try {
    const jobs = await prisma.workshopJob.findMany({
      include: {
        lead: {
          include: {
            customer: true,
            technician: true
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
    
    const jobId = parseInt(id as string);
    
    // Validate status
    if (!Object.values(WorkshopStatus).includes(status)) {
        res.status(400).json({ message: 'Invalid status' });
        return;
    }

    const dataToUpdate: any = { status };
    if (notes) dataToUpdate.notes = notes;
    if (status === 'Delivered') {
        dataToUpdate.delivered_at = new Date();
    }

    const updatedJob = await prisma.workshopJob.update({
      where: { id: jobId },
      data: dataToUpdate,
      include: {
        lead: true
      }
    });

    // Also update lead status if delivered or ready
    if (status === 'Delivered') {
        await prisma.lead.update({
            where: { id: updatedJob.lead_id },
            data: { status: 'Completed' }
        });
    }

    res.json({ message: 'Workshop job updated', job: updatedJob });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update workshop job' });
  }
};
export const deleteWorkshopJob = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const jobId = parseInt(id as string);

    // Get the job first to find the lead
    const job = await prisma.workshopJob.findUnique({ where: { id: jobId } });
    if (!job) {
      res.status(404).json({ message: 'Workshop job not found' });
      return;
    }

    // Use transaction to ensure data consistency
    await prisma.$transaction([
      // 1. Delete the workshop job
      prisma.workshopJob.delete({ where: { id: jobId } }),
      // 2. Reset the lead status back to Assigned (so it returns to the technician list)
      prisma.lead.update({
        where: { id: job.lead_id },
        data: { status: 'Assigned' }
      })
    ]);

    res.json({ message: 'Workshop record removed and lead returned to technician' });
  } catch (error) {
    console.error('Delete workshop job error:', error);
    res.status(500).json({ message: 'Failed to remove workshop record' });
  }
};
