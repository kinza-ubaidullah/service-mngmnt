import { io, Socket } from 'socket.io-client';
import { resolveApiUrl } from '../utils/apiConfig';

const socketUrl = resolveApiUrl();

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
