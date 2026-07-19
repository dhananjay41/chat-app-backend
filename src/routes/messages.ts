import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { Message } from '../models/Message';
import { Conversation } from '../models/Conversation';
import mongoose from 'mongoose';

const router = Router();
router.use(requireAuth);

// GET /conversations/:id/messages
// Supports cursor-based pagination and reconnect gap-fill via `since`
router.get('/:id/messages', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: conversationId } = req.params;
    const { cursor, since, limit = '50' } = req.query;

    const parsedLimit = Math.min(parseInt(limit as string, 10) || 50, 100);
    
    // Verify user is a member
    const isMember = await Conversation.exists({
      _id: conversationId,
      members: req.userId,
    });

    if (!isMember) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const query: any = { conversationId: new mongoose.Types.ObjectId(conversationId as string) };

    if (since) {
      // Reconnect gap-fill mode
      const sinceDate = new Date(since as string);
      if (!isNaN(sinceDate.getTime())) {
        query.createdAt = { $gt: sinceDate };
      }
    } else if (cursor) {
      // Pagination mode (older messages)
      const cursorDate = new Date(cursor as string);
      if (!isNaN(cursorDate.getTime())) {
        query.createdAt = { $lt: cursorDate };
      }
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(parsedLimit)
      .populate('senderId', 'displayName avatarUrl')
      .populate({
        path: 'forwardedFrom.senderId',
        select: 'displayName avatarUrl'
      });

    // Return messages in chronological order for the client
    const chronologicalMessages = messages.reverse();

    const hasMore = messages.length === parsedLimit;
    const nextCursor = hasMore ? messages[messages.length - 1].createdAt.toISOString() : null;

    res.json({
      messages: chronologicalMessages,
      cursor: nextCursor,
      hasMore,
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
