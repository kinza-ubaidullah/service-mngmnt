import type { Request, Response } from 'express';
import { prisma } from '../utils/prisma';

export const getAdminStats = async (req: Request, res: Response) => {
  try {
    const [
      totalLeads,
      newLeads,
      assignedJobs,
      workshopJobs,
      totalCollected
    ] = await Promise.all([
      prisma.lead.count(),
      prisma.lead.count({ where: { status: 'New' } }),
      prisma.lead.count({ where: { status: 'Assigned' } }),
      prisma.workshopJob.count({ where: { NOT: { status: 'Delivered' } } }),
      prisma.lead.aggregate({
        _sum: {
          collected_amount: true
        }
      })
    ]);

    // Recent leads
    const recentLeads = await prisma.lead.findMany({
      take: 5,
      orderBy: { created_at: 'desc' },
      include: {
        customer: true,
        technician: { select: { name: true } }
      }
    });

    // Fetch active technicians with locations and their current assignments
    const technicians = await prisma.user.findMany({
      where: {
        role: 'TECHNICIAN',
        is_active: true,
        NOT: { lat: null }
      },
      select: {
        id: true,
        name: true,
        lat: true,
        lng: true,
        specialization: true,
        assigned_jobs: {
          where: {
            status: { in: ['Assigned', 'InProgress', 'Reopened'] }
          },
          include: {
            customer: true
          }
        }
      }
    });

    res.json({
      stats: {
        totalLeads,
        newLeads,
        assignedJobs,
        workshopJobs,
        revenue: totalCollected._sum.collected_amount || 0
      },
      recentLeads,
      technicians
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard stats' });
  }
};
