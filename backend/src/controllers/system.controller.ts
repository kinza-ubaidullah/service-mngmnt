import type { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { broadcastDataChange } from '../utils/broadcast';

export const getLogs = async (req: Request, res: Response) => {
  try {
    const { module } = req.query;
    const modules = module
      ? String(module).split(/[,|]/).map(m => m.trim()).filter(Boolean)
      : null;

    const logs = await prisma.systemLog.findMany({
      where: modules ? { module: { in: modules } } : undefined,
      orderBy: { created_at: 'desc' },
      take: 500
    });
    res.json({ logs });
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ message: 'Error fetching logs' });
  }
};

export const getTrash = async (req: Request, res: Response) => {
  try {
    const { model_name } = req.query;
    const trash = await prisma.trash.findMany({
      where: model_name ? { model_name: String(model_name) } : undefined,
      orderBy: { deleted_at: 'desc' }
    });
    res.json({ trash });
  } catch (error) {
    console.error('Error fetching trash:', error);
    res.status(500).json({ message: 'Error fetching trash' });
  }
};

async function restoreRecord(modelName: string, data: Record<string, unknown>, recordId: number) {
  switch (modelName) {
    case 'Expense': {
      const { id: _id, ...record } = data;
      return prisma.expense.create({ data: record as any });
    }
    case 'Lead': {
      const oldStatus = (data.old_status as string) || 'New';
      return prisma.lead.update({
        where: { id: recordId },
        data: { status: oldStatus as any }
      });
    }
    default:
      throw new Error(`Restore not supported for model: ${modelName}`);
  }
}

export const restoreTrash = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    const trashItem = await prisma.trash.findUnique({ where: { id: Number(id) } });
    if (!trashItem) return res.status(404).json({ message: 'Trash item not found' });

    const restored = await restoreRecord(
      trashItem.model_name,
      trashItem.data as Record<string, unknown>,
      trashItem.record_id
    );

    await prisma.trash.delete({ where: { id: trashItem.id } });

    await prisma.systemLog.create({
      data: {
        user_id: user.id,
        user_name: user.name,
        action_type: 'RESTORE',
        module: trashItem.model_name,
        new_value: restored as any,
        panel: 'Admin Panel'
      }
    });

    broadcastDataChange('system', 'restore');
    broadcastDataChange('all', 'restore');
    res.json({ message: 'Record restored', record: restored });
  } catch (error) {
    console.error('Error restoring trash item:', error);
    res.status(500).json({ message: 'Error restoring record' });
  }
};

export const deleteTrash = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    const trashItem = await prisma.trash.findUnique({ where: { id: Number(id) } });
    if (!trashItem) return res.status(404).json({ message: 'Trash item not found' });

    if (trashItem.model_name === 'Lead') {
      await prisma.lead.delete({ where: { id: trashItem.record_id } }).catch(() => {});
    }

    await prisma.trash.delete({ where: { id: trashItem.id } });

    await prisma.systemLog.create({
      data: {
        user_id: user.id,
        user_name: user.name,
        action_type: 'PERMANENT_DELETE',
        module: trashItem.model_name,
        old_value: trashItem.data as any,
        panel: 'Admin Panel'
      }
    });

    broadcastDataChange('leads', 'delete');
    broadcastDataChange('system', 'delete');
    res.json({ message: 'Record permanently deleted' });
  } catch (error) {
    console.error('Error permanently deleting trash item:', error);
    res.status(500).json({ message: 'Error deleting record' });
  }
};
