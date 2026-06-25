import { socket } from './socket';

export type TechLocationUpdate = {
  techId: number;
  lat: number;
  lng: number;
};

type Listener = (data: TechLocationUpdate) => void;

const listeners = new Set<Listener>();
let socketBound = false;

const broadcast = (data: TechLocationUpdate) => {
  const payload = {
    techId: Number(data.techId),
    lat: Number(data.lat),
    lng: Number(data.lng),
  };
  listeners.forEach((listener) => listener(payload));
};

const ensureSocket = () => {
  if (socketBound) return;
  socketBound = true;
  socket.connect();
  socket.emit('join_room', 'operations');
  socket.on('tech_location_changed', broadcast);
  socket.on('connect', () => {
    socket.emit('join_room', 'operations');
  });
};

const releaseSocket = () => {
  if (!socketBound || listeners.size > 0) return;
  socket.off('tech_location_changed', broadcast);
  socketBound = false;
};

export const subscribeToTechLocations = (listener: Listener) => {
  listeners.add(listener);
  ensureSocket();
  return () => {
    listeners.delete(listener);
    releaseSocket();
  };
};
