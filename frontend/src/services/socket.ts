import { io, Socket } from 'socket.io-client';

// Always use new VPS in production, localhost in dev
const socketUrl =
  typeof window !== 'undefined' &&
  window.location.hostname !== 'localhost' &&
  window.location.hostname !== '127.0.0.1'
    ? 'https://api.aljaroshi.tech'
    : (import.meta.env.VITE_API_URL || 'http://localhost:5000');

// Connect to the socket server
export const socket: Socket = io(socketUrl, {
  autoConnect: false,
  withCredentials: true,
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 2000,
});

export default socket;
