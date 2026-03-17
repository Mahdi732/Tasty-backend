import http from 'http';
import { randomUUID } from 'crypto';
import { Server as SocketIOServer } from 'socket.io';

const toUserRoom = (userId) => `user:${String(userId)}`;

export const createRealtimeGateway = ({ env, logger }) => {
  const httpServer = http.createServer();
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.CORS_ORIGINS_LIST,
      credentials: true,
    },
    path: '/socket.io',
  });

  io.on('connection', (socket) => {
    const correlationId =
      socket.handshake.headers['x-correlation-id']
      || socket.handshake.headers['x-request-id']
      || randomUUID();

    const userId = socket.handshake.auth?.userId || socket.handshake.query?.userId;
    if (userId) {
      socket.join(toUserRoom(userId));
      logger.info({ socketId: socket.id, userId, correlationId }, 'socket_user_joined_room');
    } else {
      logger.warn({ socketId: socket.id, correlationId }, 'socket_connected_without_user_room');
    }
  });

  const emitTimerUpdate = ({ userId, orderId, event = 'timer.update', status = 'warning' }) => {
    if (!userId) {
      return;
    }
    io.to(toUserRoom(userId)).emit(event, { orderId, status, userId, at: new Date().toISOString() });
  };

  const emitOrderExpired = ({ userId, orderId, debtAmount = 0, idNumberMasked = 'UNKNOWN' }) => {
    if (!userId) {
      return;
    }
    io.to(toUserRoom(userId)).emit('order.expired', {
      orderId,
      userId,
      debtAmount,
      idNumberMasked,
      at: new Date().toISOString(),
    });
  };

  const start = async () => new Promise((resolve) => {
    httpServer.listen(env.SOCKET_PORT, () => {
      logger.info({ port: env.SOCKET_PORT }, 'notification_socket_server_started');
      resolve();
    });
  });

  const close = async () => {
    await io.close();
    await new Promise((resolve) => httpServer.close(resolve));
  };

  return {
    io,
    start,
    close,
    emitTimerUpdate,
    emitOrderExpired,
  };
};
