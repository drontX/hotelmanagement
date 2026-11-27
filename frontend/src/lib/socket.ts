import { io, Socket } from 'socket.io-client';
import type { RoomStatusUpdateEvent } from '@/types';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:8000';

let socketInstance: Socket | null = null;

export function getSocket(): Socket {
  if (!socketInstance) {
    socketInstance = io(SOCKET_URL, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });
  }
  return socketInstance;
}

export function subscribeRoomUpdates(
  callback: (event: RoomStatusUpdateEvent) => void
): () => void {
  const socket = getSocket();
  if (!socket.connected) {
    socket.connect();
  }

  const handler = (payload: RoomStatusUpdateEvent) => {
    callback(payload);
  };

  socket.on('room:statusUpdated', handler);
  socket.on('room_status_updated', handler);

  return () => {
    socket.off('room:statusUpdated', handler);
    socket.off('room_status_updated', handler);
  };
}

export function disconnectSocket(): void {
  if (socketInstance?.connected) {
    socketInstance.disconnect();
  }
}
