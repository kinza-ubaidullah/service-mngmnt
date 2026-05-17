import { io, Socket } from 'socket.io-client';

const socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Connect to the socket server
export const socket: Socket = io(socketUrl, {
  autoConnect: false,
  withCredentials: true
});

export default socket;
