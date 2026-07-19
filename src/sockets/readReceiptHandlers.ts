import { Namespace, Socket } from 'socket.io';
import { Message } from '../models/Message';

import logger from '../lib/logger';

export const registerReadReceiptHandlers = (chatNamespace: Namespace, socket: Socket) => {
  socket.on('message:read', async (payload) => {
    try {
      const { conversationId, messageId } = payload;
      const userId = socket.userId;

      if (!userId || !messageId) return;

      // Update ALL messages in this conversation where this user hasn't read them
      await Message.updateMany(
        { 
          conversationId,
          'readBy.userId': { $ne: userId } // only add if not already read
        },
        { 
          $push: { readBy: { userId, readAt: new Date() } } 
        }
      );
      
      // We still emit the read ack for the latest message to update the UI for other users
      const message = true;

      if (message) {
        // Broadcast read receipt to the room
        chatNamespace.to(conversationId).emit('message:read:ack', {
          conversationId,
          messageId,
          userId,
        });
      }
    } catch (error) {
      logger.error('Error in message:read', { error });
    }
  });
};
