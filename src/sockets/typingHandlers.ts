import { Namespace, Socket } from 'socket.io';

import logger from '../lib/logger';

export const registerTypingHandlers = (_chatNamespace: Namespace, socket: Socket) => {
  socket.on('typing:start', async (payload) => {
    try {
      const { conversationId } = payload;
      const userId = socket.userId;

      // Ensure user is part of the conversation (simple check, assume joined room)
      // Broadcast to the conversation room, excluding the sender
      socket.to(conversationId).emit('typing:start', { conversationId, userId });
    } catch (error) {
      logger.error('Error in typing:start', { error });
    }
  });

  socket.on('typing:stop', async (payload) => {
    try {
      const { conversationId } = payload;
      const userId = socket.userId;

      socket.to(conversationId).emit('typing:stop', { conversationId, userId });
    } catch (error) {
      logger.error('Error in typing:stop', { error });
    }
  });
};
