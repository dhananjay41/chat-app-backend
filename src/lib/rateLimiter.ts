// In-memory rate limiter for socket events
// Limits to max 5 messages per second per user
const WINDOW_MS = 1000;
const MAX_REQUESTS = 5;

const userActivity = new Map<string, { count: number; windowStart: number }>();

export const checkRateLimit = (userId: string): boolean => {
  const now = Date.now();
  const record = userActivity.get(userId);

  if (!record) {
    userActivity.set(userId, { count: 1, windowStart: now });
    return true;
  }

  // If we are past the current window, reset
  if (now - record.windowStart > WINDOW_MS) {
    record.count = 1;
    record.windowStart = now;
    return true;
  }

  // If within the window, check count
  if (record.count >= MAX_REQUESTS) {
    return false; // Rate limit exceeded
  }

  record.count += 1;
  return true;
};
