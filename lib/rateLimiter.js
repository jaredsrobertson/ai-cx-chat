const attempts = new Map();

export function rateLimit(identifier, maxAttempts = 10, windowMs = 60000) {
  const now = Date.now();
  const userAttempts = attempts.get(identifier) || { count: 0, resetTime: now + windowMs };
  
  if (now > userAttempts.resetTime) {
    userAttempts.count = 0;
    userAttempts.resetTime = now + windowMs;
  }
  
  userAttempts.count++;
  attempts.set(identifier, userAttempts);
  
  return userAttempts.count <= maxAttempts;
}