import type { Request, Response } from 'express';
import { prisma } from '../utils/prisma.js';

export const getTeams = async (req: Request, res: Response) => {
  try {
    const teams = await prisma.team.findMany({
      include: {
        users: { select: { id: true, name: true, phone: true } },
        leads: { select: { id: true, status: true, collected_amount: true } }
      }
    });
    res.json({ teams });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching teams' });
  }
};

export const createTeam = async (req: Request, res: Response) => {
  try {
    const { name, contact, payment_model } = req.body;
    const team = await prisma.team.create({
      data: {
        name,
        contact,
        payment_model: payment_model ? JSON.parse(JSON.stringify(payment_model)) : null
      }
    });
    res.json({ message: 'Team created', team });
  } catch (error) {
    res.status(500).json({ message: 'Error creating team' });
  }
};

export const updateTeam = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, contact, payment_model } = req.body;
    
    const team = await prisma.team.update({
      where: { id: parseInt(id as string) },
      data: {
        name,
        contact,
        payment_model: payment_model ? JSON.parse(JSON.stringify(payment_model)) : null
      }
    });
    res.json({ message: 'Team updated', team });
  } catch (error) {
    res.status(500).json({ message: 'Error updating team' });
  }
};

export const assignUserToTeam = async (req: Request, res: Response) => {
  try {
    const { userId, teamId } = req.body;
    const user = await prisma.user.update({
      where: { id: Number(userId) },
      data: { team_id: teamId ? Number(teamId) : null }
    });
    res.json({ message: 'User assignment updated', user });
  } catch (error) {
    res.status(500).json({ message: 'Error assigning user' });
  }
};

export const deleteTeam = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // Unassign all users first
    await prisma.user.updateMany({
      where: { team_id: parseInt(id as string) },
      data: { team_id: null }
    });
    await prisma.team.delete({ where: { id: parseInt(id as string) } });
    res.json({ message: 'Team deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting team' });
  }
};
