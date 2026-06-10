import type { Server } from 'socket.io';

let io: Server | null = null;

export type DataModule =
  | 'leads'
  | 'workshop'
  | 'finance'
  | 'dashboard'
  | 'users'
  | 'system'
  | 'expenses'
  | 'settlements'
  | 'all';

export function setSocketServer(server: Server) {
  io = server;
}

export function broadcastDataChange(module: DataModule, action = 'update') {
  if (!io) return;
  const payload = { module, action, at: Date.now() };
  io.to('operations').emit('data_changed', payload);
  if (module !== 'all') {
    io.to('operations').emit('data_changed', { module: 'all', action, at: Date.now() });
  }
}
