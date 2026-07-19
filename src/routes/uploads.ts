import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import cloudinary from '../lib/cloudinary';
import { rateLimit } from 'express-rate-limit';
import logger from '../lib/logger';

const router = Router();
router.use(requireAuth);

// §5 Security: token-bucket rate limit on uploads sign endpoint
const uploadSignLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many upload signature requests. Please try again later.' },
});

router.post('/sign', uploadSignLimiter, (req: Request, res: Response) => {
  try {
    const timestamp = Math.round(new Date().getTime() / 1000);
    
    // §2.4: Signed, scoped, short-TTL upload signature
    // The client can only use this to upload files to the specified folder with strictly allowed formats.
    const paramsToSign = {
      timestamp,
      folder: `chatapp/users/${req.userId}`,
      allowed_formats: 'jpg,jpeg,png,gif,webp,mp4,webm',
    };

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      process.env.CLOUDINARY_API_SECRET || ''
    );

    res.json({
      timestamp,
      signature,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      folder: paramsToSign.folder,
      allowedFormats: paramsToSign.allowed_formats,
    });
  } catch (error) {
    logger.error('Failed to generate Cloudinary signature', { error, userId: req.userId });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
