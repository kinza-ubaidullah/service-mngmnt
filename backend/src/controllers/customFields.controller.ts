import type { Request, Response } from 'express';
import { prisma } from '../utils/prisma';

export const getCustomFields = async (req: Request, res: Response) => {
  try {
    const { module } = req.query;
    const fields = await prisma.customField.findMany({
      where: module ? { module: String(module) } : undefined,
      orderBy: { created_at: 'asc' }
    });
    res.json({ fields });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching custom fields' });
  }
};

export const createCustomField = async (req: Request, res: Response) => {
  try {
    const { module, field_name, field_type, options, is_required } = req.body;
    const field = await prisma.customField.create({
      data: {
        module: module || 'RecurringPayment',
        field_name,
        field_type,
        options,
        is_required: !!is_required
      }
    });
    
    // Log activity
    const user = (req as any).user;
    await prisma.systemLog.create({
      data: {
        user_id: user.id,
        user_name: user.name,
        action_type: 'CREATE',
        module: 'Finance',
        new_value: field as any,
        panel: 'Admin Panel'
      }
    });

    res.json({ message: 'Custom field created', field });
  } catch (error) {
    res.status(500).json({ message: 'Error creating custom field' });
  }
};

export const deleteCustomField = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const field = await prisma.customField.findUnique({ where: { id: Number(id) } });
    if (!field) return res.status(404).json({ message: 'Field not found' });

    await prisma.customField.delete({ where: { id: Number(id) } });

    // Log activity
    const user = (req as any).user;
    await prisma.systemLog.create({
      data: {
        user_id: user.id,
        user_name: user.name,
        action_type: 'DELETE',
        module: 'Finance',
        old_value: field as any,
        panel: 'Admin Panel'
      }
    });

    res.json({ message: 'Custom field deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting custom field' });
  }
};
