import type { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { broadcastDataChange } from '../utils/broadcast';

// Builds the per-job payment ledger for one technician.
// Every completed job is a separate payable item — payments are always per-task.
const buildTechnicianLedger = async (techId: number) => {
  const completedJobs = await prisma.lead.findMany({
    where: { assigned_to: techId, status: 'Completed' },
    orderBy: { updated_at: 'desc' },
    select: {
      id: true,
      lead_id: true,
      product_type: true,
      collected_amount: true,
      total_amount: true,
      updated_at: true,
      customer: { select: { name: true, phone: true, area: true } }
    }
  });

  const settlements = await prisma.technicianSettlement.findMany({
    where: { technician_id: techId },
    orderBy: { created_at: 'desc' }
  });

  const receiverIds = [...new Set(settlements.map(s => s.received_by).filter(Boolean))] as number[];
  const receivers = receiverIds.length
    ? await prisma.user.findMany({ where: { id: { in: receiverIds } }, select: { id: true, name: true } })
    : [];
  const receiverMap = Object.fromEntries(receivers.map(r => [r.id, r.name]));

  const settledByLead = new Map<number, any>();
  const requestedByLead = new Map<number, any>();
  for (const s of settlements) {
    if (s.lead_id) {
      if (s.is_received && !settledByLead.has(s.lead_id)) {
        settledByLead.set(s.lead_id, s);
      } else if (!s.is_received && !requestedByLead.has(s.lead_id)) {
        requestedByLead.set(s.lead_id, s);
      }
    }
  }

  const jobs = completedJobs.map(job => {
    const settlement = settledByLead.get(job.id) || null;
    const amount = Number(job.collected_amount || 0);
    const requested = requestedByLead.get(job.id) || null;
    return {
      id: job.id,
      lead_id: job.lead_id,
      product_type: job.product_type,
      customer: job.customer,
      amount,
      completed_at: job.updated_at,
      is_settled: !!settlement,
      is_requested: !!requested && !settlement,
      settlement: settlement
        ? {
            id: settlement.id,
            amount: Number(settlement.amount),
            received_at: settlement.received_at,
            received_by_name: settlement.received_by ? receiverMap[settlement.received_by] || 'Admin' : 'Admin',
            description: settlement.description
          }
        : requested
        ? {
            id: requested.id,
            amount: Number(requested.amount),
            is_requested: true
          }
        : null
    };
  });

  const totalCollected = jobs.reduce((s, j) => s + j.amount, 0);
  const totalReceived = jobs.filter(j => j.is_settled).reduce((s, j) => s + (j.settlement?.amount ?? j.amount), 0);
  const pendingJobs = jobs.filter(j => !j.is_settled && j.amount > 0);
  const overdue = pendingJobs.reduce((s, j) => s + j.amount, 0);

  return { jobs, settlements, totalCollected, totalReceived, overdue, pendingCount: pendingJobs.length };
};

export const getTechnicianWallet = async (req: Request, res: Response) => {
  try {
    const { technicianId } = req.params;
    const techId = Number(technicianId);
    const user = (req as any).user;
    if (user.role === 'TECHNICIAN' && user.id !== techId) {
      res.status(403).json({ message: 'Unauthorized' });
      return;
    }

    const ledger = await buildTechnicianLedger(techId);

    res.json({
      ...ledger,
      // kept for backward compatibility with older UI bits
      completedJobs: ledger.jobs.map(j => ({
        id: j.id,
        lead_id: j.lead_id,
        collected_amount: j.amount,
        updated_at: j.completed_at,
        customer: { name: j.customer?.name },
        is_settled: j.is_settled
      }))
    });
  } catch (error) {
    console.error('Wallet error:', error);
    res.status(500).json({ message: 'Failed to fetch wallet' });
  }
};

export const requestSettlement = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user.role !== 'TECHNICIAN') {
      res.status(403).json({ message: 'Only technicians can request settlements' });
      return;
    }
    const techId = user.id;
    const { lead_id } = req.body;

    if (!lead_id) {
      res.status(400).json({ message: 'lead_id is required' });
      return;
    }

    const lead = await prisma.lead.findUnique({
      where: { id: Number(lead_id) },
      select: { id: true, lead_id: true, assigned_to: true, status: true, collected_amount: true, product_type: true }
    });

    if (!lead) return res.status(404).json({ message: 'Task not found' });
    if (lead.assigned_to !== techId) return res.status(400).json({ message: 'Unauthorized task' });

    const amount = Number(lead.collected_amount || 0);
    if (amount <= 0) return res.status(400).json({ message: 'No amount to settle' });

    const existing = await prisma.technicianSettlement.findFirst({
      where: { lead_id: lead.id, technician_id: techId }
    });

    if (existing) {
      if (existing.is_received) return res.status(400).json({ message: 'Already settled' });
      return res.json({ message: 'Request already pending' });
    }

    await prisma.technicianSettlement.create({
      data: {
        technician_id: techId,
        amount,
        description: `Deposit request for ${lead.lead_id} — ${lead.product_type}`,
        lead_id: lead.id,
        is_received: false,
      }
    });

    broadcastDataChange('settlements', 'create');
    res.json({ message: 'Deposit request sent to Admin successfully' });
  } catch (error) {
    console.error('Request settlement error:', error);
    res.status(500).json({ message: 'Failed to request settlement' });
  }
};

// Manual per-task payment: lead_id is REQUIRED, amount always comes from the
// job's own collected amount. Lump-sum / combined payments are not allowed.
export const markSettlementReceived = async (req: Request, res: Response) => {
  try {
    const { technicianId } = req.params;
    const techId = Number(technicianId);
    const { lead_id } = req.body;
    const user = (req as any).user;

    if (!lead_id) {
      res.status(400).json({ message: 'lead_id is required — payments are recorded per task, combined payments are not allowed' });
      return;
    }

    const lead = await prisma.lead.findUnique({
      where: { id: Number(lead_id) },
      select: {
        id: true,
        lead_id: true,
        product_type: true,
        assigned_to: true,
        status: true,
        collected_amount: true,
        customer: { select: { name: true } }
      }
    });

    if (!lead) {
      res.status(404).json({ message: 'Task not found' });
      return;
    }
    if (lead.assigned_to !== techId) {
      res.status(400).json({ message: 'This task does not belong to the selected technician' });
      return;
    }
    if (lead.status !== 'Completed') {
      res.status(400).json({ message: 'Payment can only be received for completed tasks' });
      return;
    }

    const amount = Number(lead.collected_amount || 0);
    if (amount <= 0) {
      res.status(400).json({ message: 'No collected amount recorded for this task' });
      return;
    }

    const existing = await prisma.technicianSettlement.findFirst({
      where: { lead_id: lead.id, technician_id: techId }
    });

    let settlement;
    if (existing) {
      if (existing.is_received) {
        res.status(400).json({ message: `Payment for task ${lead.lead_id} has already been received` });
        return;
      }
      settlement = await prisma.technicianSettlement.update({
        where: { id: existing.id },
        data: {
          is_received: true,
          received_at: new Date(),
          received_by: user.id,
          description: `Payment for ${lead.lead_id} — ${lead.product_type} (${lead.customer?.name || 'Customer'})`
        }
      });
    } else {
      settlement = await prisma.technicianSettlement.create({
        data: {
          technician_id: techId,
          amount,
          description: `Payment for ${lead.lead_id} — ${lead.product_type} (${lead.customer?.name || 'Customer'})`,
          lead_id: lead.id,
          is_received: true,
          received_at: new Date(),
          received_by: user.id
        }
      });
    }

    broadcastDataChange('settlements', 'create');
    res.json({ message: `Payment of PKR ${amount.toLocaleString()} received for task ${lead.lead_id}`, settlement });
  } catch (error) {
    console.error('Settlement error:', error);
    res.status(500).json({ message: 'Failed to record settlement' });
  }
};

export const getAllTechnicianWallets = async (_req: Request, res: Response) => {
  try {
    const technicians = await prisma.user.findMany({
      where: { role: 'TECHNICIAN', is_active: true },
      select: { id: true, name: true }
    });

    const wallets = await Promise.all(technicians.map(async (tech) => {
      const ledger = await buildTechnicianLedger(tech.id);
      return {
        id: tech.id,
        name: tech.name,
        totalCollected: ledger.totalCollected,
        totalReceived: ledger.totalReceived,
        overdue: ledger.overdue,
        pendingCount: ledger.pendingCount,
        jobs: ledger.jobs
      };
    }));

    res.json({ wallets });
  } catch (error) {
    console.error('Wallets error:', error);
    res.json({ wallets: [] });
  }
};
