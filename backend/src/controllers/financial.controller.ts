import type { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { broadcastDataChange } from '../utils/broadcast';

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
        status: { in: ['Completed', 'PendingApproval', 'InspectionCompleted', 'PickedForWorkshop', 'InProgress'] },
        updated_at: { gte: last7Days }
      },
      select: {
        updated_at: true,
        collected_amount: true,
        total_amount: true,
        status: true
      }
    });

    let expenses: Array<{ date: Date; amount: any; is_recurring?: boolean }>;
    try {
      expenses = await prisma.expense.findMany({
        where: { date: { gte: last7Days } },
        select: { date: true, amount: true, is_recurring: true }
      });
    } catch {
      const basic = await prisma.expense.findMany({
        where: { date: { gte: last7Days } },
        select: { date: true, amount: true }
      });
      expenses = basic.map((e) => ({ ...e, is_recurring: false }));
    }

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
        if (chartMap[dateStr]) {
          const amount = Number(l.collected_amount || 0) || Number(l.total_amount || 0);
          chartMap[dateStr].revenue += amount;
        }
    });

    expenses.forEach(e => {
        if (e.is_recurring) return;
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
        user: { select: { name: true, role: true } },
      },
      orderBy: { date: 'desc' }
    });

    const leadIds = expenses.map((e) => e.lead_id).filter(Boolean) as number[];
    const linkedLeads = leadIds.length
      ? await prisma.lead.findMany({
          where: { id: { in: leadIds } },
          select: {
            id: true,
            lead_id: true,
            product_type: true,
            collected_amount: true,
            customer: { select: { name: true, phone: true, area: true } },
            technician: { select: { id: true, name: true, phone: true } },
          },
        })
      : [];
    const leadMap = Object.fromEntries(linkedLeads.map((l) => [l.id, l]));

    res.json({
      reinvestments: expenses.map((e) => ({
        ...e,
        lead: e.lead_id ? leadMap[e.lead_id] || null : null,
      })),
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching reinvestments' });
  }
};

export const addReinvestment = async (req: Request, res: Response) => {
  try {
    const { amount, category, description, date, is_recurring, frequency, due_day, custom_data, lead_id } = req.body;
    const user = (req as any).user;

    const data: any = {
      user_id: user.id,
      amount: Number(amount),
      category,
      description,
      date: date ? new Date(date) : new Date(),
      is_recurring: !!is_recurring,
      custom_data: custom_data || null
    };

    if (lead_id) {
      data.lead_id = Number(lead_id);
    }

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

    await prisma.systemLog.create({
      data: {
        user_id: user.id,
        user_name: user.name,
        action_type: 'CREATE',
        module: 'Finance',
        new_value: expense as any,
        panel: 'Admin / Manager Panel'
      }
    });

    broadcastDataChange('finance', 'create');
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
        is_recurring: false,
        custom_data: schedule.custom_data ?? undefined
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

    await prisma.systemLog.create({
      data: {
        user_id: user.id,
        user_name: user.name,
        action_type: 'PAY_RECURRING',
        module: 'Finance',
        old_value: schedule as any,
        new_value: { expense: newExpense, next_due: nextDue } as any,
        panel: 'Admin / Manager Panel'
      }
    });

    broadcastDataChange('finance', 'pay');
    res.json({ message: 'Recurring payment successfully registered', expense: newExpense });
  } catch (error) {
    console.error('Pay recurring error:', error);
    res.status(500).json({ message: 'Error executing recurring payment' });
  }
};

export const deleteExpenseRecord = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    const expense = await prisma.expense.findUnique({ where: { id: Number(id) } });
    if (!expense) return res.status(404).json({ message: 'Expense not found' });

    // Move to Trash
    await prisma.trash.create({
      data: {
        model_name: 'Expense',
        record_id: expense.id,
        data: expense as any,
        deleted_by: user.id
      }
    });

    await prisma.expense.delete({
      where: { id: Number(id) }
    });

    await prisma.systemLog.create({
      data: {
        user_id: user.id,
        user_name: user.name,
        action_type: 'DELETE_TO_TRASH',
        module: 'Finance',
        old_value: expense as any,
        panel: 'Admin / Manager Panel'
      }
    });

    broadcastDataChange('finance', 'delete');
    broadcastDataChange('system', 'delete');
    res.json({ message: 'Expense record moved to Trash' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting expense record' });
  }
};

export const updateExpenseRecord = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    const { amount, category, description, date, frequency, due_day, custom_data } = req.body;

    const expense = await prisma.expense.findUnique({ where: { id: Number(id) } });
    if (!expense) return res.status(404).json({ message: 'Expense not found' });

    const updateData: any = {};
    if (amount !== undefined) updateData.amount = Number(amount);
    if (category !== undefined) updateData.category = category;
    if (description !== undefined) updateData.description = description;
    if (date !== undefined) updateData.date = new Date(date);
    if (frequency !== undefined) updateData.frequency = frequency;
    if (due_day !== undefined) updateData.due_day = Number(due_day);
    if (custom_data !== undefined) updateData.custom_data = custom_data;

    const updated = await prisma.expense.update({
      where: { id: Number(id) },
      data: updateData,
      include: { user: { select: { name: true } } }
    });

    await prisma.systemLog.create({
      data: {
        user_id: user.id,
        user_name: user.name,
        action_type: 'UPDATE',
        module: 'Finance',
        old_value: expense as any,
        new_value: updated as any,
        panel: 'Admin / Manager Panel'
      }
    });

    broadcastDataChange('finance', 'update');
    res.json({ message: 'Expense updated', expense: updated });
  } catch (error) {
    console.error('Error updating expense:', error);
    res.status(500).json({ message: 'Error updating expense record' });
  }
};

const parseLeadPictures = (lead: {
  item_pictures?: unknown;
  house_image?: string | null;
  product_image?: string | null;
}): string[] => {
  const pics: string[] = [];
  if (lead.product_image) pics.push(lead.product_image);
  if (lead.house_image) pics.push(lead.house_image);
  if (lead.item_pictures) {
    if (Array.isArray(lead.item_pictures)) {
      pics.push(...(lead.item_pictures as string[]));
    } else if (typeof lead.item_pictures === 'string') {
      try {
        const parsed = JSON.parse(lead.item_pictures);
        if (Array.isArray(parsed)) pics.push(...parsed);
      } catch { /* ignore */ }
    }
  }
  return [...new Set(pics.filter(Boolean))];
};

const mapLeadDetail = (j: any) => ({
  id: j.id,
  lead_id: j.lead_id,
  product_type: j.product_type,
  status: j.status,
  amount: Number(j.collected_amount || 0),
  total_amount: Number(j.total_amount || 0),
  agreed_amount: Number(j.agreed_amount || 0),
  completed_at: j.updated_at,
  visit_date: j.visit_date,
  exact_address: j.exact_address,
  problem_details: j.problem_details,
  actual_problem: j.actual_problem,
  repair_details: j.repair_details,
  warranty_months: j.warranty_months,
  pictures: parseLeadPictures(j),
  customer: j.customer,
  technician: j.technician
});

// Per-task revenue and per-expense breakdown for Finance summary cards
export const getFinanceSummaryDetails = async (_req: Request, res: Response) => {
  try {
    const leadSelect = {
      id: true,
      lead_id: true,
      product_type: true,
      status: true,
      collected_amount: true,
      total_amount: true,
      agreed_amount: true,
      updated_at: true,
      visit_date: true,
      exact_address: true,
      problem_details: true,
      actual_problem: true,
      repair_details: true,
      warranty_months: true,
      house_image: true,
      product_image: true,
      item_pictures: true,
      customer: { select: { name: true, phone: true, area: true, exact_address: true, google_map_link: true } },
      technician: { select: { id: true, name: true, phone: true } }
    } as const;

    const [revenueJobs, expenses] = await Promise.all([
      prisma.lead.findMany({
        where: { status: 'Completed' },
        orderBy: { updated_at: 'desc' },
        select: leadSelect
      }),
      prisma.expense.findMany({
        where: { is_recurring: false },
        orderBy: { date: 'desc' },
        include: { user: { select: { id: true, name: true, role: true, phone: true } } }
      })
    ]);

    const leadIds = expenses.map(e => e.lead_id).filter(Boolean) as number[];
    const linkedLeads = leadIds.length
      ? await prisma.lead.findMany({ where: { id: { in: leadIds } }, select: leadSelect })
      : [];
    const leadMap = Object.fromEntries(linkedLeads.map(l => [l.id, l]));

    const revenueItems = revenueJobs
      .filter(j => Number(j.collected_amount || 0) > 0)
      .map(mapLeadDetail);

    const expenseItems = expenses.map(e => {
      const linked = e.lead_id ? leadMap[e.lead_id] : null;
      const recipientMatch = (e.description || '').match(/Payment to ([^-]+)/i);
      return {
        id: e.id,
        amount: Number(e.amount),
        category: e.category,
        description: e.description,
        date: e.date,
        recorded_by: e.user?.name || 'Unknown',
        recorded_by_role: e.user?.role,
        recorded_by_phone: e.user?.phone || null,
        recipient_name: recipientMatch?.[1]?.trim() || null,
        lead: linked ? mapLeadDetail(linked) : null,
        custom_data: e.custom_data
      };
    });

    const totalRevenue = revenueItems.reduce((s, j) => s + j.amount, 0);
    const totalExpenses = expenseItems.reduce((s, e) => s + e.amount, 0);

    const netLines = [
      ...revenueItems.map(j => ({
        type: 'revenue' as const,
        label: j.lead_id,
        sub: `${j.product_type} — ${j.customer?.name || 'Customer'} (Tech: ${j.technician?.name || 'N/A'})`,
        amount: j.amount,
        sign: '+' as const
      })),
      ...expenseItems.map(e => ({
        type: 'expense' as const,
        label: e.category,
        sub: e.description || e.recipient_name || 'Expense',
        amount: e.amount,
        sign: '-' as const
      }))
    ];

    res.json({
      totalRevenue,
      totalExpenses,
      netBalance: totalRevenue - totalExpenses,
      revenueItems,
      expenseItems,
      netLines
    });
  } catch (error) {
    console.error('Finance summary details error:', error);
    res.status(500).json({ message: 'Failed to fetch finance details' });
  }
};
