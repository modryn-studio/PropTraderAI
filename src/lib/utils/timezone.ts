/**
 * Timezone Utilities
 * 
 * Handles timezone conversion for distributed traders.
 * All strategy times are stored in exchange time (America/Chicago for CME).
 * 
 * Extracted from: Claude Skills bundle (SKILL.md Section 1.4)
 * Updated: January 10, 2026
 */

/**
 * Supported trader timezones
 */
export const TRADER_TIMEZONES = {
  'America/New_York': 'US Eastern Time (ET)',
  'America/Chicago': 'US Central Time (CT)',
  'America/Los_Angeles': 'US Pacific Time (PT)',
  'America/Denver': 'US Mountain Time (MT)',
  'Europe/London': 'UK Time (GMT/BST)',
  'Europe/Paris': 'Central European Time (CET)',
  'Europe/Berlin': 'Central European Time (CET)',
  'Asia/Singapore': 'Singapore Time (SGT)',
  'Asia/Hong_Kong': 'Hong Kong Time (HKT)',
  'Australia/Sydney': 'Australian Eastern Time (AEST)',
} as const;

/**
 * Exchange timezone (CME for futures)
 */
export const EXCHANGE_TIMEZONE = 'America/Chicago';

/**
 * Common timezone abbreviations mapping
 */
const TIMEZONE_ABBR_MAP: Record<string, keyof typeof TRADER_TIMEZONES> = {
  et: 'America/New_York',
  est: 'America/New_York',
  edt: 'America/New_York',
  ct: 'America/Chicago',
  cst: 'America/Chicago',
  cdt: 'America/Chicago',
  pt: 'America/Los_Angeles',
  pst: 'America/Los_Angeles',
  pdt: 'America/Los_Angeles',
  mt: 'America/Denver',
  mst: 'America/Denver',
  mdt: 'America/Denver',
  gmt: 'Europe/London',
  bst: 'Europe/London',
  cet: 'Europe/Paris',
  cest: 'Europe/Paris',
};

/**
 * Parse timezone from user input
 * Handles abbreviations (ET, PST), city names (London, New York), or full IANA names
 */
export function parseTimezone(input: string): keyof typeof TRADER_TIMEZONES | null {
  const normalized = input.toLowerCase().trim();

  // Check abbreviations first
  if (TIMEZONE_ABBR_MAP[normalized]) {
    return TIMEZONE_ABBR_MAP[normalized];
  }

  // Check if it's a valid IANA timezone
  if (normalized in TRADER_TIMEZONES) {
    return normalized as keyof typeof TRADER_TIMEZONES;
  }

  // Try to match city names
  const cityMap: Record<string, keyof typeof TRADER_TIMEZONES> = {
    'new york': 'America/New_York',
    'chicago': 'America/Chicago',
    'los angeles': 'America/Los_Angeles',
    'denver': 'America/Denver',
    'london': 'Europe/London',
    'paris': 'Europe/Paris',
    'berlin': 'Europe/Berlin',
    'singapore': 'Asia/Singapore',
    'hong kong': 'Asia/Hong_Kong',
    'sydney': 'Australia/Sydney',
  };

  return cityMap[normalized] || null;
}

/**
 * Convert time from trader's timezone to exchange timezone
 * 
 * Note: This is a simplified conversion that doesn't account for DST.
 * For production, use a library like date-fns-tz or luxon.
 */
export function convertToExchangeTime(
  time: string, // Format: "HH:MM" in 24-hour format
  traderTimezone: keyof typeof TRADER_TIMEZONES
): { exchangeTime: string; timezone: typeof EXCHANGE_TIMEZONE } {
  // Timezone offset differences from UTC (simplified, ignores DST)
  const UTC_OFFSETS: Record<keyof typeof TRADER_TIMEZONES, number> = {
    'America/New_York': -5,
    'America/Chicago': -6,
    'America/Los_Angeles': -8,
    'America/Denver': -7,
    'Europe/London': 0,
    'Europe/Paris': 1,
    'Europe/Berlin': 1,
    'Asia/Singapore': 8,
    'Asia/Hong_Kong': 8,
    'Australia/Sydney': 11,
  };

  const [hours, minutes] = time.split(':').map(Number);
  
  // Convert to UTC
  const traderOffset = UTC_OFFSETS[traderTimezone];
  const utcHours = hours - traderOffset;
  
  // Convert from UTC to exchange time
  const exchangeOffset = UTC_OFFSETS[EXCHANGE_TIMEZONE];
  let exchangeHours = utcHours + exchangeOffset;
  
  // Handle day boundaries
  if (exchangeHours < 0) exchangeHours += 24;
  if (exchangeHours >= 24) exchangeHours -= 24;
  
  // Format back to HH:MM
  const exchangeTime = `${String(exchangeHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  
  return {
    exchangeTime,
    timezone: EXCHANGE_TIMEZONE,
  };
}

/**
 * Validate time string format (HH:MM)
 */
export function isValidTimeFormat(time: string): boolean {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
}

/**
 * Get trading session name based on time
 */
export function getTradingSession(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes;

  // Times in Exchange Time (America/Chicago)
  const OPENING_RANGE_START = 8 * 60 + 30; // 8:30 AM CT (9:30 AM ET)
  const OPENING_RANGE_END = 9 * 60 + 30; // 9:30 AM CT (10:30 AM ET)
  const LUNCH_START = 11 * 60 + 30; // 11:30 AM CT
  const LUNCH_END = 13 * 60 + 30; // 1:30 PM CT
  const MARKET_CLOSE = 15 * 60; // 3:00 PM CT (4:00 PM ET)

  if (totalMinutes >= OPENING_RANGE_START && totalMinutes < OPENING_RANGE_END) {
    return 'Opening Range (High Volatility)';
  } else if (totalMinutes >= LUNCH_START && totalMinutes < LUNCH_END) {
    return 'Lunch Session (Low Volume)';
  } else if (totalMinutes >= OPENING_RANGE_END && totalMinutes < LUNCH_START) {
    return 'Morning Session';
  } else if (totalMinutes >= LUNCH_END && totalMinutes < MARKET_CLOSE) {
    return 'Afternoon Session';
  } else if (totalMinutes >= MARKET_CLOSE && totalMinutes < 17 * 60) {
    return 'Market Close';
  } else {
    return 'Extended Hours (Low Liquidity)';
  }
}

/**
 * Check if time is during Regular Trading Hours (RTH)
 */
export function isDuringRTH(time: string): boolean {
  const [hours] = time.split(':').map(Number);
  // RTH: 8:30 AM - 3:00 PM CT (9:30 AM - 4:00 PM ET)
  return hours >= 8 && hours < 15;
}
