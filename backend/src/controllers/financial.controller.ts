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
        date: { gte: last7Days },
        is_recurring: false
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
        is_recurring: false
      },
      include: {
        user: { select: { name: true } }
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
    const { amount, category, description, date, is_recurring, frequency, due_day } = req.body;
    const user = (req as any).user;

    const data: any = {
      user_id: user.id,
      amount: Number(amount),
      category,
      description,
      date: date ? new Date(date) : new Date(),
      is_recurring: !!is_recurring
    };

    if (is_recurring) {
      data.frequency = frequency || 'Monthly';
      data.due_day = due_day ? Number(due_day) : 1;
      
      // Calculate next due date
      const today = new Date();
      let nextDue = new Date(today.getFullYear(), today.getMonth(), data.due_day);
      if (nextDue < today) {
        nextDue.setMonth(nextDue.getMonth() + 1);
      }
      data.next_due = nextDue;
    }

    const expense = await prisma.expense.create({
      data,
      include: {
        user: { select: { name: true } }
      }
    });

    res.json({ message: is_recurring ? 'Recurring payment schedule added' : 'Expense recorded', expense });
  } catch (error) {
    console.error('Error recording expense:', error);
    res.status(500).json({ message: 'Error recording expense' });
  }
};

export const getRecurringSchedules = async (req: Request, res: Response) => {
  try {
    const schedules = await prisma.expense.findMany({
      where: { is_recurring: true },
      include: {
        user: { select: { name: true } }
      },
      orderBy: { next_due: 'asc' }
    });
    res.json({ schedules });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching recurring schedules' });
  }
};

export const payRecurringSchedule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    const schedule = await prisma.expense.findUnique({
      where: { id: Number(id) }
    });

    if (!schedule || !schedule.is_recurring) {
       res.status(404).json({ message: 'Recurring schedule not found' });
       return;
    }

    // 1. Create a regular expense from schedule
    const newExpense = await prisma.expense.create({
      data: {
        user_id: user.id,
        amount: schedule.amount,
        category: schedule.category,
        description: `Recurring Payment for: ${schedule.description || schedule.category}`,
        date: new Date(),
        is_recurring: false
      }
    });

    // 2. Calculate next due date
    const currentNextDue = schedule.next_due ? new Date(schedule.next_due) : new Date();
    let nextDue = new Date(currentNextDue);
    if (schedule.frequency === 'Weekly') {
      nextDue.setDate(nextDue.getDate() + 7);
    } else { // Monthly default
      nextDue.setMonth(nextDue.getMonth() + 1);
    }

    // 3. Update schedule
    await prisma.expense.update({
      where: { id: schedule.id },
      data: {
        last_paid: new Date(),
        next_due: nextDue
      }
    });

    res.json({ message: 'Recurring payment successfully registered', expense: newExpense });
  } catch (error) {
    console.error('Pay recurring error:', error);
    res.status(500).json({ message: 'Error executing recurring payment' });
  }
};

export const deleteExpenseRecord = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.expense.delete({
      where: { id: Number(id) }
    });
    res.json({ message: 'Expense record deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting expense record' });
  }
};
