/**
 * DEMO AUTH ROUTES
 *
 * INTENTIONAL DEVIATION FROM PRODUCTION AUTH (per client spec):
 * These routes replace the standard email+password login with a simple
 * "select a seeded user" flow for testing/demo purposes.
 *
 * What is NOT relaxed (Part 1 §5 still applies in full):
 * - JWT access token is issued exactly as before (same secret, same expiry)
 * - httpOnly refresh token cookie is set exactly as before
 * - Socket handshake auth in chatNamespace.ts is unchanged
 * - Per-event re-authorization in every socket handler is unchanged
 * - Rate limiting on select-user endpoint is applied
 *
 * What is simplified:
 * - No email or password — selecting a userId is sufficient to get a token
 * - No bcrypt, no credential validation
 * - Registration is explicitly out of scope
 */

import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { authRateLimiter } from '../middleware/rateLimit';
import logger from '../lib/logger';

const router = Router();

// --- Helpers ---
const generateAccessToken = (userId: string): string =>
  jwt.sign({ id: userId }, process.env.JWT_ACCESS_SECRET || 'dev-access-secret', {
    expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN || '15m') as any,
  });

const generateRefreshToken = (userId: string): string =>
  jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret', {
    expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as any,
  });

const setRefreshTokenCookie = (res: Response, token: string): void => {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

/**
 * GET /auth/users
 * Returns the list of seeded demo users for the login select screen.
 * No auth required — this is a public endpoint for the demo login UI.
 */
router.get('/users', async (_req: Request, res: Response): Promise<void> => {
  try {
    const users = await User.find({}, 'username displayName avatarUrl').lean();
    res.json(users);
  } catch (error) {
    logger.error('Error fetching user list', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /auth/select-user
 * DEMO AUTH: Issues a JWT for the selected userId without credential verification.
 * The userId must exist in the seeded user collection.
 *
 * @body { userId: string }
 * @returns { userId, accessToken, displayName, username, avatarUrl }
 */
router.post('/select-user', authRateLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.body;

    if (!userId || typeof userId !== 'string') {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    // Validate the user exists (prevents arbitrary ID injection)
    const user = await User.findById(userId).lean();
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());

    setRefreshTokenCookie(res, refreshToken);
    logger.info('Demo user selected', { userId: user._id, username: user.username });

    res.json({
      userId: user._id.toString(),
      accessToken,
      displayName: user.displayName,
      username: user.username,
      avatarUrl: user.avatarUrl,
    });
  } catch (error) {
    logger.error('select-user error', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /auth/refresh
 * Rotates the refresh token and issues a new access token.
 * Returns user profile so the client can restore displayName/username after a page reload.
 */
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    const refreshToken = req.cookies.refreshToken as string | undefined;
    if (!refreshToken) {
      res.status(401).json({ error: 'No refresh token provided' });
      return;
    }

    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret'
    ) as { id: string };

    const user = await User.findById(decoded.id).lean();
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    const accessToken = generateAccessToken(user._id.toString());
    const newRefreshToken = generateRefreshToken(user._id.toString());
    setRefreshTokenCookie(res, newRefreshToken);

    res.json({
      userId: user._id.toString(),
      accessToken,
      displayName: user.displayName,
      username: user.username,
      avatarUrl: user.avatarUrl,
    });
  } catch (error) {
    logger.error('Refresh token error', { error });
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

/**
 * POST /auth/logout
 * Clears the refresh token cookie.
 */
router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
  });
  res.json({ success: true });
});

export default router;
