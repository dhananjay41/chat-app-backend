import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import logger from './lib/logger';
import authRoutes from './routes/auth';
import conversationsRoutes from './routes/conversations';
import { initChatNamespace } from './sockets/chatNamespace';
import mongoose from 'mongoose';

const app = express();
app.set('trust proxy', 1); // Trust first proxy (required for Render/Heroku)
const httpServer = createServer(app);

// --- CORS allow-list (§5 Security: strict CORS allow-list) ---
const envOrigins = process.env.CORS_ORIGINS ?? 'http://localhost:3000';
const ALLOWED_ORIGINS = envOrigins === '*' ? true : envOrigins.split(',');

// --- Socket.IO server on /chat namespace (§2.1: one namespace) ---
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: ALLOWED_ORIGINS,
    credentials: true,
  },
});

// --- Express middleware ---
app.use(helmet()); // §5 Security: Helmet defaults
app.use(
  cors({
    origin: ALLOWED_ORIGINS,
    credentials: true,
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// --- Health check ---
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

import messagesRoutes from './routes/messages';
import uploadsRoutes from './routes/uploads';

// --- Routes ---
app.use('/auth', authRoutes);
app.use('/conversations', conversationsRoutes);
app.use('/conversations', messagesRoutes);
app.use('/api/uploads', uploadsRoutes);

// --- Socket.IO /chat namespace ---
const chatNamespace = initChatNamespace(io);

// --- Start server ---
const PORT = parseInt(process.env.PORT ?? '4000', 10);

const startServer = async () => {
  try {
    if (process.env.MONGODB_URI) {
      await mongoose.connect(process.env.MONGODB_URI);
      logger.info('Connected to MongoDB');
    } else {
      logger.warn('MONGODB_URI not set. Skipping DB connection.');
    }
    
    httpServer.listen(PORT, () => {
      logger.info(`Server listening on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
};

startServer();

export { app, httpServer, io, chatNamespace };
