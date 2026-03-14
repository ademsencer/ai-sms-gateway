import { createHash } from 'crypto';

/**
 * Generates a SHA-256 deduplication key for an SMS message.
 * Combines deviceId, sender, message content, and timestamp.
 */
export function generateSmsDedupKey(
  deviceId: string,
  sender: string,
  message: string,
  timestamp: number,
): string {
  const raw = `${deviceId}:${sender}:${message}:${timestamp}`;
  return createHash('sha256').update(raw).digest('hex');
}
