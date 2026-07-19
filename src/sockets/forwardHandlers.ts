import { Namespace, Socket } from 'socket.io';
import { Message } from '../models/Message';
import { Conversation } from '../models/Conversation';
import mongoose from 'mongoose';
import logger from '../lib/logger';
import { checkRateLimit } from '../lib/rateLimiter';

export const registerForwardHandlers = (chatNamespace: Namespace, socket: Socket) => {
  socket.on('message:forward', async (payload, callback) => {
    try {
      const { originalMessageId, targetConversationId, clientTempId } = payload;
      const userId = socket.userId;

      if (!userId) {
        throw new Error('Unauthorized');
      }

      if (!checkRateLimit(userId)) {
        logger.warn('Rate limit exceeded for user on forward', { userId });
        throw new Error('Rate limit exceeded. Please slow down.');
      }

      // 1. Fetch original message to verify existence
      const originalMessage = await Message.findById(originalMessageId);
      if (!originalMessage) {
        throw new Error('Original message not found');
      }

      // 2. Verify user has access to the original message's conversation
      const sourceConversation = await Conversation.findOne({
        _id: originalMessage.conversationId,
        members: userId,
      });

      if (!sourceConversation) {
        logger.warn('Unauthorized forward attempt (source)', { userId, originalMessageId });
        throw new Error('Unauthorized access to source message');
      }

      // 3. Verify user has access to the target conversation
      const targetConversation = await Conversation.findOne({
        _id: targetConversationId,
        members: userId,
      });

      if (!targetConversation) {
        logger.warn('Unauthorized forward attempt (target)', { userId, targetConversationId });
        throw new Error('Unauthorized access to target conversation');
      }

      // 4. Create new forwarded message
      const forwardedMessage = new Message({
        conversationId: targetConversationId,
        senderId: userId,
        body: originalMessage.body,
        attachments: originalMessage.attachments, // Reference same Cloudinary assets
        forwardedFrom: {
          messageId: originalMessage._id,
          conversationId: originalMessage.conversationId,
          senderId: originalMessage.senderId,
        },
        clientTempId,
      });

      await forwardedMessage.save();
      const populatedMessage = await forwardedMessage.populate('senderId', 'displayName avatarUrl');

      // Update target conversation lastMessage
      targetConversation.lastMessage = forwardedMessage.id as mongoose.Types.ObjectId;
      await targetConversation.save();

      // 5. Broadcast to target room and member's personal rooms
      const memberRooms = targetConversation.members.map((m: any) => m.toString());
      chatNamespace.to([targetConversationId, ...memberRooms]).emit('message:forwarded', populatedMessage);

      // 6. Acknowledge to sender to reconcile optimistic UI
      if (typeof callback === 'function') {
        callback({
          success: true,
          clientTempId,
          serverId: forwardedMessage._id,
          timestamp: forwardedMessage.createdAt,
        });
      }

      socket.emit('message:ack', {
        clientTempId,
        serverId: forwardedMessage._id,
        timestamp: forwardedMessage.createdAt,
      });

      logger.info('Message forwarded successfully', { 
        userId, 
        originalMessageId, 
        targetConversationId,
        newMessageId: forwardedMessage._id 
      });

    } catch (error) {
      logger.error('Error handling message:forward', { error, userId: socket.userId });
      if (typeof callback === 'function') {
        callback({ success: false, error: 'Failed to forward message' });
      }
    }
  });
};
