import type { Request, Response } from 'express';
import { prisma } from '../utils/prisma';

export const getTechnicianEarnings = async (req: Request, res: Response) => {
  try {
    const technicians = await prisma.user.findMany({
      where: { role: 'TECHNICIAN' },
      select: {
        id: true,
        name: true,
        team: {
          select: { payment_model: true }
        },
        assigned_jobs: {
          where: { status: 'Completed' },
          select: {
            id: true,
            collected_amount: true,
            lead_id: true,
            updated_at: true
          }
        }
      }
    });

    const report = technicians.map(tech => {
      // Default 10% commission if no payment_model set
      let commissionRate = 0.10;
      const paymentModel = tech.team?.payment_model as any;
      if (paymentModel?.type === 'commission' && paymentModel?.rate) {
        commissionRate = paymentModel.rate / 100;
      }

      const totalRevenue = tech.assigned_jobs.reduce((sum, job) => sum + Number(job.collected_amount || 0), 0);
      const totalCommission = totalRevenue * commissionRate;

      return {
        id: tech.id,
        name: tech.name,
        jobCount: tech.assigned_jobs.length,
        totalRevenue,
        totalCommission,
        jobs: tech.assigned_jobs
      };
    });

    res.json({ report });
  } catch (error) {
    console.error('Error fetching earnings report:', error);
    res.status(500).json({ message: 'Failed to fetch earnings report' });
  }
};

// Summary for a single technician (for their own wallet view)
export const getMyEarningsSummary = async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      
      const jobs = await prisma.lead.findMany({
        where: { assigned_to: user.id, status: 'Completed' },
        select: { collected_amount: true }
      });
  
      // Get team commission rate
      const userData = await prisma.user.findUnique({
          where: { id: user.id },
          include: { team: true }
      });
  
      let rate = 0.10;
      const model = userData?.team?.payment_model as any;
      if (model?.type === 'commission') rate = model.rate / 100;
  
      const totalRevenue = jobs.reduce((sum, job) => sum + Number(job.collected_amount || 0), 0);
      const commission = totalRevenue * rate;
  
      res.json({
        totalRevenue,
        commission,
        rate: rate * 100
      });
    } catch (error) {
      res.status(500).json({ message: 'Error fetching personal earnings' });
    }
  };

export const getFinancialChartData = async (req: Request, res: Response) => {
  try {
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);

    const leads = await prisma.lead.findMany({
      where: {
        status: 'Completed',
        updated_at: { gte: last7Days }
      },
      select: {
        updated_at: true,
        collected_amount: true
      }
    });

    const expenses = await prisma.expense.findMany({
      where: {
        date: { gte: last7Days }
      },
      select: {
        date: true,
        amount: true
      }
    });

    // Group by date
    const chartMap: any = {};
    
    // Initialize last 7 days
    for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
        chartMap[dateStr] = { date: dateStr, revenue: 0, expenses: 0 };
    }

    leads.forEach(l => {
        const dateStr = new Date(l.updated_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
        if (chartMap[dateStr]) chartMap[dateStr].revenue += Number(l.collected_amount || 0);
    });

    expenses.forEach(e => {
        const dateStr = new Date(e.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
        if (chartMap[dateStr]) chartMap[dateStr].expenses += Number(e.amount || 0);
    });

    const chartData = Object.values(chartMap).reverse();
    res.json({ chartData });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching chart data' });
  }
};

export const getReinvestments = async (req: Request, res: Response) => {
  try {
    const expenses = await prisma.expense.findMany({
      where: {
        category: { startsWith: 'Reinvestment' }
      },
      orderBy: { date: 'desc' }
    });
    res.json({ reinvestments: expenses });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching reinvestments' });
  }
};

export const addReinvestment = async (req: Request, res: Response) => {
  try {
    const { amount, category, description, date } = req.body;
    const user = (req as any).user;

    const expense = await prisma.expense.create({
      data: {
        user_id: user.id,
        amount: Number(amount),
        category: `Reinvestment: ${category}`,
        description,
        date: date ? new Date(date) : new Date()
      }
    });

    res.json({ message: 'Reinvestment recorded', expense });
  } catch (error) {
    res.status(500).json({ message: 'Error recording reinvestment' });
  }
};
