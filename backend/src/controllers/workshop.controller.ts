import type { Request, Response } from 'express';
import { prisma } from '../utils/prisma.js';
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
