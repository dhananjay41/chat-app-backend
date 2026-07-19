import { Namespace, Socket } from 'socket.io';


// In-memory presence tracker
// Maps userId to a set of active socket IDs
const activeUsers = new Map<string, Set<string>>();

export const registerPresenceHandlers = (chatNamespace: Namespace, socket: Socket) => {
  const userId = socket.userId;
  if (!userId) return;

  // Add socket to user's active connections
  if (!activeUsers.has(userId)) {
    activeUsers.set(userId, new Set());
    
    // Broadcast user online to everyone
    // (In a scale-out architecture, this would go through Redis PUB/SUB or query friends list)
    chatNamespace.emit('presence:update', { userId, status: 'active' });
  }
  activeUsers.get(userId)!.add(socket.id);

  // Send the current list of online users to the newly connected socket
  const onlineUserIds = Array.from(activeUsers.keys());
  socket.emit('presence:sync', { onlineUserIds });

  socket.on('disconnect', () => {
    const userSockets = activeUsers.get(userId);
    if (userSockets) {
      userSockets.delete(socket.id);
      
      // If no sockets left, user is offline
      if (userSockets.size === 0) {
        activeUsers.delete(userId);
        chatNamespace.emit('presence:update', { userId, status: 'offline' });
      }
    }
  });

  // Client can explicitly send presence:update (e.g. idle)
  socket.on('presence:update', (payload) => {
    const { status } = payload;
    chatNamespace.emit('presence:update', { userId, status });
  });
};
