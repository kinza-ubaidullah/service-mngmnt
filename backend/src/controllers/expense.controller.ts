import type { Request, Response } from 'express';
import { prisma } from '../utils/prisma.js';
import { broadcastDataChange } from '../utils/broadcast';

// Create a new expense (Technician action)
export const createExpense = async (req: Request, res: Response) => {
  try {
    const { amount, category, description, lead_id } = req.body;
    const user = (req as any).user;

    const expense = await prisma.expense.create({
      data: {
        user_id: user.id,
        amount: parseFloat(amount),
        category,
        description,
        lead_id: lead_id ? parseInt(lead_id) : null,
      },
    });

    broadcastDataChange('expenses', 'create');
    res.status(201).json({ message: 'Expense recorded successfully', expense });
  } catch (error) {
    console.error('Error creating expense:', error);
    res.status(500).json({ message: 'Failed to record expense' });
  }
};

// Get technician's own expenses
export const getMyExpenses = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    const expenses = await prisma.expense.findMany({
      where: { user_id: user.id },
      orderBy: { date: 'desc' },
      take: 20
    });

    res.json({ expenses });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({ message: 'Failed to fetch expenses' });
  }
};

// Get Wallet Summary (Current Balance calculation)
export const getWalletSummary = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    // 1. Total Collected from Jobs
    const collections = await prisma.lead.aggregate({
      where: { assigned_to: user.id },
      _sum: { collected_amount: true }
    });

    // 2. Total Expenses
    const expenses = await prisma.expense.aggregate({
      where: { user_id: user.id },
      _sum: { amount: true }
    });

    const totalCollected = Number(collections._sum.collected_amount || 0);
    const totalSpent = Number(expenses._sum.amount || 0);
    const balance = totalCollected - totalSpent;

    res.json({
      summary: {
        totalCollected,
        totalSpent,
        balance
      }
    });
  } catch (error) {
    console.error('Error calculating wallet summary:', error);
    res.status(500).json({ message: 'Failed to calculate wallet summary' });
  }
};
