import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

// Extend Socket to hold the user info
declare module 'socket.io' {
  interface Socket {
    userId?: string;
  }
}

export const socketAuthMiddleware = (socket: Socket, next: (err?: Error) => void) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error('Authentication error: Missing token'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET || 'dev-access-secret') as { id: string };
    socket.userId = decoded.id;
    next();
  } catch (error) {
    return next(new Error('Authentication error: Invalid or expired token'));
  }
};
