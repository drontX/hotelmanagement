import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';

let io: SocketIOServer | null = null;

export function initSocket(httpServer: HttpServer): SocketIOServer {
  const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:3001')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: allowedOrigins.length > 0 ? allowedOrigins : '*',
      credentials: true,
    },
  });

  io.on('connection', (socket: Socket) => {
    socket.on('join:hotel', (hotelId: string) => {
      if (hotelId) {
        socket.join(`hotel:${hotelId}`);
      }
    });

    socket.on('join:admin', () => {
      socket.join('admin');
    });

    socket.on('leave:hotel', (hotelId: string) => {
      if (hotelId) {
        socket.leave(`hotel:${hotelId}`);
      }
    });
  });

  return io;
}

export function getIO(): SocketIOServer | null {
  return io;
}

export function emitRoomStatusChanged(payload: {
  roomId: string;
  hotelId: string;
  roomNumber?: string;
  status: string;
}): void {
  if (!io) return;
  io.to(`hotel:${payload.hotelId}`).emit('room:status_changed', payload);
  io.to('admin').emit('room:status_changed', payload);
  io.emit('room:updated', payload);
}

export function emitBookingEvent(
  event: 'booking:created' | 'booking:updated' | 'booking:checked_in' | 'booking:checked_out' | 'booking:canceled',
  payload: Record<string, unknown>
): void {
  if (!io) return;
  io.to('admin').emit(event, payload);
  io.emit(event, payload);
}

export function emitHousekeepingEvent(
  event: 'housekeeping:created' | 'housekeeping:updated',
  payload: Record<string, unknown>
): void {
  if (!io) return;
  io.to('admin').emit(event, payload);
  io.emit(event, payload);
}

export function emitPaymentEvent(
  event: 'payment:completed' | 'payment:failed',
  payload: Record<string, unknown>
): void {
  if (!io) return;
  io.to('admin').emit(event, payload);
  io.emit(event, payload);
}
