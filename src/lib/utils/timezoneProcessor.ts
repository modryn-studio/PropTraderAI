/**
 * Timezone Post-Processor for Strategy Rules
 * 
 * Converts user-specified times to exchange time (America/Chicago)
 * Called after Claude parses the strategy, before saving to database.
 * 
 * Phase: 1B
 * Updated: January 10, 2026
 */

import { parseTimezone, convertToExchangeTime, isValidTimeFormat, TRADER_TIMEZONES } from './timezone';
import type { ParsedRules, Filter } from '@/lib/claude/client';

/**
 * Context passed to processor (from conversation history + user profile)
 */
export interface TimezoneContext {
  // Detected from user messages like "I trade 9:30 AM PT" or "I'm in London"
  userTimezone?: keyof typeof TRADER_TIMEZONES;
  
  // From user profile settings (fallback if not detected from conversation)
  profileTimezone?: keyof typeof TRADER_TIMEZONES;
}

/**
 * Result of timezone processing
 */
export interface TimezoneProcessResult {
  // Updated rules with times in exchange timezone
  processedRules: ParsedRules;
  
  // Conversion log for user confirmation
  conversions: {
    original: string;
    converted: string;
    timezone: string;
    isDST: boolean;
  }[];
  
  // Any warnings or issues
  warnings: string[];
}

/**
 * Extract timezone from conversation history
 * Looks for patterns like:
 * - "I trade 9:30 AM PT"
 * - "I'm in Pacific Time"
 * - "London session"
 * - "New York hours"
 */
export function extractTimezoneFromConversation(
  userMessages: string[]
): keyof typeof TRADER_TIMEZONES | null {
  const combinedText = userMessages.join(' ').toLowerCase();

  // Check for timezone abbreviations
  const tzAbbrevMatches = combinedText.match(/\b(et|est|edt|pt|pst|pdt|ct|cst|cdt|mt|mst|mdt|gmt|bst|cet|cest)\b/i);
  if (tzAbbrevMatches) {
    const parsed = parseTimezone(tzAbbrevMatches[0]);
    if (parsed) return parsed;
  }

  // Check for city names
  const cityMatches = combinedText.match(/\b(new york|chicago|los angeles|denver|london|paris|berlin|singapore|hong kong|sydney)\b/i);
  if (cityMatches) {
    const parsed = parseTimezone(cityMatches[0]);
    if (parsed) return parsed;
  }

  // Check for session references (implies timezone)
  if (combinedText.includes('ny session') || combinedText.includes('new york session')) {
    return 'America/New_York';
  }
  if (combinedText.includes('london session')) {
    return 'Europe/London';
  }
  if (combinedText.includes('asian session') || combinedText.includes('singapore')) {
    return 'Asia/Singapore';
  }

  return null;
}

/**
 * Process time_window filters in parsed rules
 * Converts times to exchange timezone if user timezone is known
 */
export function processTimezones(
  parsedRules: ParsedRules,
  context: TimezoneContext
): TimezoneProcessResult {
  const conversions: TimezoneProcessResult['conversions'] = [];
  const warnings: string[] = [];
  
  // Clone rules to avoid mutating original
  const processedRules: ParsedRules = JSON.parse(JSON.stringify(parsedRules));

  // Determine which timezone to use: conversation detection > profile setting > none
  const effectiveTimezone = context.userTimezone || context.profileTimezone;
  
  // If no timezone available, assume times are already in exchange time
  if (!effectiveTimezone) {
    warnings.push('No timezone detected. Assuming times are in Exchange Time (America/Chicago).');
    return { processedRules, conversions, warnings };
  }

  // If effective timezone is already exchange timezone, no conversion needed
  if (effectiveTimezone === 'America/Chicago') {
    return { processedRules, conversions, warnings };
  }
  
  // Add info about which timezone source was used
  if (context.userTimezone) {
    // Timezone was detected from conversation - high confidence
  } else if (context.profileTimezone) {
    warnings.push(`Using your profile timezone: ${effectiveTimezone}. Mention your timezone in the conversation to override.`);
  }

  // Process each filter
  processedRules.filters = processedRules.filters.map((filter: Filter) => {
    // Only process time_window filters
    if (filter.type !== 'time_window') {
      return filter;
    }

    // Validate time format
    if (filter.start && !isValidTimeFormat(filter.start)) {
      warnings.push(`Invalid start time format: ${filter.start}. Expected HH:MM format.`);
      return filter;
    }
    if (filter.end && !isValidTimeFormat(filter.end)) {
      warnings.push(`Invalid end time format: ${filter.end}. Expected HH:MM format.`);
      return filter;
    }

    // Convert start time
    if (filter.start) {
      const result = convertToExchangeTime(filter.start, effectiveTimezone);
      conversions.push({
        original: `${filter.start} ${effectiveTimezone}`,
        converted: `${result.exchangeTime} America/Chicago`,
        timezone: effectiveTimezone,
        isDST: result.isDST,
      });
      filter.start = result.exchangeTime;
    }

    // Convert end time
    if (filter.end) {
      const result = convertToExchangeTime(filter.end, effectiveTimezone);
      conversions.push({
        original: `${filter.end} ${effectiveTimezone}`,
        converted: `${result.exchangeTime} America/Chicago`,
        timezone: effectiveTimezone,
        isDST: result.isDST,
      });
      filter.end = result.exchangeTime;
    }

    // Update filter description to show conversion
    if (filter.description && conversions.length > 0) {
      filter.description += ` (converted from ${effectiveTimezone})`;
    }

    return filter;
  });

  return { processedRules, conversions, warnings };
}

/**
 * Format conversion summary for user display
 */
export function formatConversionSummary(result: TimezoneProcessResult): string {
  if (result.conversions.length === 0 && result.warnings.length === 0) {
    return '';
  }

  let summary = '';

  if (result.conversions.length > 0) {
    summary += '**Timezone Conversions:**\n';
    result.conversions.forEach(conv => {
      summary += `- ${conv.original} → ${conv.converted}\n`;
    });
  }

  if (result.warnings.length > 0) {
    summary += '\n**Warnings:**\n';
    result.warnings.forEach(warn => {
      summary += `- ${warn}\n`;
    });
  }

  return summary;
}
