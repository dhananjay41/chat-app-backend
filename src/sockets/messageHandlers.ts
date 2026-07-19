import { Namespace, Socket } from 'socket.io';
import { Message } from '../models/Message';
import { Conversation } from '../models/Conversation';
import mongoose from 'mongoose';
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import logger from '../lib/logger';
import { checkRateLimit } from '../lib/rateLimiter';

const window = new JSDOM('').window;
const purify = DOMPurify(window as any);

export const registerMessageHandlers = (chatNamespace: Namespace, socket: Socket) => {
  // Client emits `message:send` when sending a message
  socket.on('message:send', async (payload, callback) => {
    try {
      const { clientTempId, conversationId, body, attachments } = payload;
      const userId = socket.userId;

      if (!userId) {
        throw new Error('Unauthorized');
      }

      if (!checkRateLimit(userId)) {
        logger.warn('Rate limit exceeded for user', { userId });
        throw new Error('Rate limit exceeded. Please slow down.');
      }

      // Check if user is a member of the conversation
      const conversation = await Conversation.findOne({
        _id: conversationId,
        members: userId,
      });

      if (!conversation) {
        throw new Error('Conversation not found or unauthorized');
      }

      // Create new message
      // Basic payload sanitization: enforce string lengths and sanitize HTML
      const rawBody = typeof body === 'string' ? body.substring(0, 5000).trim() : '';
      const sanitizedBody = purify.sanitize(rawBody);

      const message = new Message({
        conversationId,
        senderId: userId,
        body: sanitizedBody,
        attachments: attachments || [],
        clientTempId,
      });

      await message.save();
      const populatedMessage = await message.populate('senderId', 'displayName avatarUrl');

      // Update conversation lastMessage
      conversation.lastMessage = message.id as mongoose.Types.ObjectId;
      await conversation.save();

      // Emit `message:new` to everyone in the room and all personal rooms of members
      const memberRooms = conversation.members.map((m: any) => m.toString());
      chatNamespace.to([conversationId, ...memberRooms]).emit('message:new', populatedMessage);

      // Acknowledge to sender to reconcile optimistic UI
      if (typeof callback === 'function') {
        callback({
          success: true,
          clientTempId,
          serverId: message._id,
          timestamp: message.createdAt,
        });
      }

      // Alternate: if we use an ack event per spec
      socket.emit('message:ack', {
        clientTempId,
        serverId: message._id,
        timestamp: message.createdAt,
      });
      
    } catch (error) {
      logger.error('Error handling message:send', { error, userId: socket.userId });
      if (typeof callback === 'function') {
        callback({ success: false, error: 'Failed to send message' });
      }
    }
  });

  // Client emits when joining a conversation view
  socket.on('room:join', async (payload, callback) => {
    try {
      const { conversationId } = payload;
      const userId = socket.userId;

      // Verify membership
      const isMember = await Conversation.exists({
        _id: conversationId,
        members: userId,
      });

      if (!isMember) {
        throw new Error('Unauthorized to join this room');
      }

      // Join Socket.IO room
      socket.join(conversationId);
      logger.debug('Socket joined room', { socketId: socket.id, conversationId });

      if (typeof callback === 'function') {
        callback({ success: true });
      }
    } catch (error) {
      logger.error('Error handling room:join', { error, userId: socket.userId });
      if (typeof callback === 'function') {
        callback({ success: false, error: 'Failed to join room' });
      }
    }
  });
};
