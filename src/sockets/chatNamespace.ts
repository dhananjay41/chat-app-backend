import { Namespace, Socket } from 'socket.io';
import { socketAuthMiddleware } from './authMiddleware';
import { registerMessageHandlers } from './messageHandlers';
import { registerPresenceHandlers } from './presenceHandlers';
import { registerTypingHandlers } from './typingHandlers';
import { registerReadReceiptHandlers } from './readReceiptHandlers';
import { registerForwardHandlers } from './forwardHandlers';
import logger from '../lib/logger';

let chatNamespace: Namespace;

export const initChatNamespace = (io: import('socket.io').Server) => {
  chatNamespace = io.of('/chat');

  // §5 Security: verify token on handshake
  chatNamespace.use(socketAuthMiddleware);

  chatNamespace.on('connection', (socket: Socket) => {
    logger.info('Socket connected (authenticated)', { socketId: socket.id, userId: socket.userId });
    if (socket.userId) {
      socket.join(socket.userId.toString());
    }

    // Register feature handlers
    registerMessageHandlers(chatNamespace, socket);
    registerPresenceHandlers(chatNamespace, socket);
    registerTypingHandlers(chatNamespace, socket);
    registerReadReceiptHandlers(chatNamespace, socket);
    registerForwardHandlers(chatNamespace, socket);

    socket.on('disconnect', (reason) => {
      logger.info('Socket disconnected', { socketId: socket.id, userId: socket.userId, reason });
    });
  });

  return chatNamespace;
};
