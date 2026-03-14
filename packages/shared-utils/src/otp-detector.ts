const OTP_PATTERN = /\b(\d{4,8})\b/;

/**
 * Extracts OTP code from SMS message text.
 * Matches sequences of 4-8 consecutive digits bounded by word boundaries.
 */
export function detectOtp(message: string): string | null {
  const match = message.match(OTP_PATTERN);
  return match ? match[1] : null;
}
