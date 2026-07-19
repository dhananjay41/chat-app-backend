import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { Conversation } from '../models/Conversation';
import { User } from '../models/User';
import mongoose from 'mongoose';
import { Message } from '../models/Message';

const router = Router();
router.use(requireAuth);

// GET /conversations/users - List all demo users except the requesting user
// Used by the "New DM" picker so the active user can start a conversation with any seeded user.
router.get('/users', async (req: Request, res: Response) => {
  try {
    const users = await User.find(
      { _id: { $ne: req.userId } },
      'username displayName avatarUrl'
    ).lean();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /conversations - List conversations for authed user
router.get('/', async (req: Request, res: Response) => {
  try {
    const conversations = await Conversation.find({ members: req.userId })
      .populate('members', 'displayName avatarUrl') // Do not populate email/hash
      .populate('lastMessage', 'body attachments') // Populate lastMessage body
      .sort({ updatedAt: -1 })
      .lean();
      
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await Message.countDocuments({
          conversationId: conv._id,
          senderId: { $ne: req.userId },
          'readBy.userId': { $ne: req.userId },
        });
        return { ...conv, unreadCount };
      })
    );
    
    res.json(conversationsWithUnread);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /conversations - Create or find DM
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { targetUserId } = req.body;
    
    if (!targetUserId) {
      res.status(400).json({ error: 'targetUserId is required' });
      return;
    }

    if (targetUserId === req.userId) {
      res.status(400).json({ error: 'Cannot create a conversation with yourself' });
      return;
    }

    // Check if user exists
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      res.status(404).json({ error: 'Target user not found' });
      return;
    }

    // Find existing DM
    const existingConv = await Conversation.findOne({
      members: { $all: [req.userId, targetUserId], $size: 2 }
    }).populate('members', 'displayName avatarUrl');

    if (existingConv) {
      res.json(existingConv);
      return;
    }

    // Create new DM
    const newConv = new Conversation({
      members: [new mongoose.Types.ObjectId(req.userId), new mongoose.Types.ObjectId(targetUserId)]
    });
    
    await newConv.save();
    
    const populatedConv = await newConv.populate('members', 'displayName avatarUrl');
    res.status(201).json(populatedConv);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
