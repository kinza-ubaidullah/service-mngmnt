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

    // Recent operations — leads with meaningful activity, newest first
    const recentLeads = await prisma.lead.findMany({
      take: 12,
      where: {
        status: {
          in: ['InspectionCompleted', 'PickedForWorkshop', 'Completed', 'PendingApproval', 'Assigned', 'InProgress', 'Reopened']
        }
      },
      orderBy: { updated_at: 'desc' },
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

    // Attention Needed Logic
    const now = new Date();
    const overdueLeads = await prisma.lead.findMany({
      where: {
        status: { notIn: ['Completed', 'Cancelled', 'Deleted', 'PickedForWorkshop'] },
        visit_date: { lt: now }
      },
      include: { customer: true, technician: true }
    });

    const pendingParts = await prisma.workshopJob.findMany({
      where: { status: 'WaitingForParts' },
      include: { lead: { include: { customer: true } } }
    });

    const highExpenses = await prisma.expense.findMany({
      where: {
        amount: { gt: 5000 },
        date: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } // last 7 days
      },
      include: { user: true }
    });

    const attentionNeeded = [];

    if (overdueLeads.length > 0) {
      attentionNeeded.push({
        type: 'LEAD',
        label: `${overdueLeads.length} Jobs Overdue`,
        sub: 'Service Leads',
        color: 'bg-red-500',
        details: overdueLeads.map(l => ({
          id: l.lead_id,
          title: `Overdue: ${l.customer.name}`,
          desc: `Assigned to: ${l.technician?.name || 'Unassigned'} - Date: ${l.visit_date ? l.visit_date.toLocaleDateString() : 'N/A'}`
        }))
      });
    }

    if (pendingParts.length > 0) {
      attentionNeeded.push({
        type: 'TECH',
        label: `${pendingParts.length} Parts Pending`,
        sub: 'Workshop Section',
        color: 'bg-amber-500',
        details: pendingParts.map(p => ({
          id: p.lead?.lead_id,
          title: `Waiting Parts: ${p.lead?.customer.name}`,
          desc: `Received: ${p.received_date.toLocaleDateString()} - Notes: ${p.notes || 'None'}`
        }))
      });
    }

    if (highExpenses.length > 0) {
      attentionNeeded.push({
        type: 'FINANCE',
        label: `${highExpenses.length} High Expenses`,
        sub: 'Finance Section',
        color: 'bg-indigo-500',
        details: highExpenses.map(e => ({
          id: `EXP-${e.id}`,
          title: `Expense: Rs. ${e.amount}`,
          desc: `By: ${e.user.name} - Category: ${e.category}`
        }))
      });
    }

    const unassignedLeads = await prisma.lead.findMany({
      where: { status: 'New', assigned_to: null },
      include: { customer: true }
    });

    if (unassignedLeads.length > 0) {
      attentionNeeded.push({
        type: 'LEAD',
        label: `${unassignedLeads.length} Unassigned Leads`,
        sub: 'Service Leads',
        color: 'bg-blue-500',
        details: unassignedLeads.map(l => ({
          id: l.lead_id,
          title: `New Lead: ${l.customer.name}`,
          desc: `Product: ${l.product_type} - Area: ${l.customer.area || 'N/A'}`
        }))
      });
    }

    res.json({
      stats: {
        totalLeads,
        newLeads,
        assignedJobs,
        workshopJobs,
        revenue: totalCollected._sum.collected_amount || 0
      },
      recentLeads,
      technicians,
      attentionNeeded
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard stats' });
  }
};
