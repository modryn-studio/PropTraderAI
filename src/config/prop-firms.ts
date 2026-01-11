/**
 * Static prop firm configuration for FirmSelectionModal
 * 
 * This is intentionally hardcoded (not from Supabase) for:
 * 1. Instant load times (no API call)
 * 2. Simpler deployment
 * 3. Firms change rarely
 * 
 * To add a new firm: Add entry to PROP_FIRMS array
 */

export interface PropFirm {
  id: string;
  name: string;
  displayName: string;
  website: string;
  color: string; // For avatar background
  aliases: string[]; // For fuzzy search
  popular?: boolean;
}

/**
 * Prop firms with Tradovate integration
 * Ordered by popularity/user base
 */
export const PROP_FIRMS: PropFirm[] = [
  {
    id: 'topstep',
    name: 'Topstep',
    displayName: 'Topstep',
    website: 'https://www.topstep.com',
    color: '#2563eb', // Blue
    aliases: ['topstep', 'top step', 'ts', 'topstepx', 'top'],
    popular: true,
  },
  {
    id: 'tradeify',
    name: 'Tradeify',
    displayName: 'Tradeify',
    website: 'https://tradeify.co',
    color: '#8b5cf6', // Purple
    aliases: ['tradeify', 'trade ify', 'tradify'],
    popular: true,
  },
  {
    id: 'myfundedfutures',
    name: 'MyFundedFutures',
    displayName: 'My Funded Futures',
    website: 'https://myfundedfutures.com',
    color: '#10b981', // Green
    aliases: ['myfundedfutures', 'my funded futures', 'mff', 'funded futures', 'my funded'],
    popular: true,
  },
  {
    id: 'alphafutures',
    name: 'AlphaFutures',
    displayName: 'Alpha Futures',
    website: 'https://alphafutures.io',
    color: '#f59e0b', // Amber
    aliases: ['alphafutures', 'alpha futures', 'alpha', 'af'],
    popular: true,
  },
  {
    id: 'apextraderfunding',
    name: 'ApexTraderFunding',
    displayName: 'Apex Trader Funding',
    website: 'https://apextraderfunding.com',
    color: '#ef4444', // Red
    aliases: ['apex', 'apex trader', 'apex trading', 'apex trader funding', 'atf', 'apextrader'],
  },
  {
    id: 'earn2trade',
    name: 'Earn2Trade',
    displayName: 'Earn2Trade',
    website: 'https://earn2trade.com',
    color: '#06b6d4', // Cyan
    aliases: ['earn2trade', 'earn 2 trade', 'e2t', 'earn to trade'],
  },
  {
    id: 'elitetraderfunding',
    name: 'EliteTraderFunding',
    displayName: 'Elite Trader Funding',
    website: 'https://elitetraderfunding.com',
    color: '#ec4899', // Pink
    aliases: ['elite', 'elite trader', 'elite trader funding', 'etf', 'elitetraderfunding'],
  },
  {
    id: 'takeprofittrader',
    name: 'TakeProfitTrader',
    displayName: 'Take Profit Trader',
    website: 'https://takeprofittrader.com',
    color: '#14b8a6', // Teal
    aliases: ['take profit', 'take profit trader', 'tpt', 'takeprofittrader'],
  },
  {
    id: 'bulenox',
    name: 'Bulenox',
    displayName: 'Bulenox',
    website: 'https://bulenox.com',
    color: '#6366f1', // Indigo
    aliases: ['bulenox', 'bule', 'bulenox trading'],
  },
  {
    id: 'tradeday',
    name: 'TradeDay',
    displayName: 'TradeDay',
    website: 'https://tradeday.com',
    color: '#84cc16', // Lime
    aliases: ['tradeday', 'trade day', 'td'],
  },
  {
    id: 'ftmo',
    name: 'FTMO',
    displayName: 'FTMO',
    website: 'https://ftmo.com',
    color: '#3b82f6', // Blue
    aliases: ['ftmo', 'ftm'],
  },
  {
    id: 'fundednext',
    name: 'FundedNext',
    displayName: 'Funded Next',
    website: 'https://fundednext.com',
    color: '#a855f7', // Purple
    aliases: ['fundednext', 'funded next', 'fn', 'next'],
  },
];

/**
 * Personal account option (not a prop firm)
 */
export const PERSONAL_ACCOUNT = {
  id: 'personal',
  name: 'Personal',
  displayName: 'Personal Account',
  color: '#64748b', // Slate
  aliases: ['personal', 'personal account', 'my account', 'own account', 'self'],
};

/**
 * Get popular firms (top 4 for quick selection)
 */
export function getPopularFirms(): PropFirm[] {
  return PROP_FIRMS.filter(firm => firm.popular);
}

/**
 * Get all firms including personal account
 */
export function getAllFirmsWithPersonal(): (PropFirm | typeof PERSONAL_ACCOUNT)[] {
  return [...PROP_FIRMS, PERSONAL_ACCOUNT];
}

/**
 * Fuzzy search firms by query
 * Returns firms where any alias starts with or contains the query
 */
export function searchFirms(query: string): PropFirm[] {
  if (!query.trim()) return [];
  
  const normalizedQuery = query.toLowerCase().trim();
  
  // Score-based ranking
  const scored = PROP_FIRMS.map(firm => {
    let score = 0;
    
    // Check aliases
    for (const alias of firm.aliases) {
      const normalizedAlias = alias.toLowerCase();
      
      // Exact match gets highest score
      if (normalizedAlias === normalizedQuery) {
        score = 100;
        break;
      }
      
      // Starts with gets high score
      if (normalizedAlias.startsWith(normalizedQuery)) {
        score = Math.max(score, 80);
      }
      
      // Contains gets medium score
      if (normalizedAlias.includes(normalizedQuery)) {
        score = Math.max(score, 50);
      }
      
      // Query contains alias (partial match)
      if (normalizedQuery.includes(normalizedAlias)) {
        score = Math.max(score, 40);
      }
    }
    
    // Also check display name
    const normalizedName = firm.displayName.toLowerCase();
    if (normalizedName.startsWith(normalizedQuery)) {
      score = Math.max(score, 70);
    }
    if (normalizedName.includes(normalizedQuery)) {
      score = Math.max(score, 45);
    }
    
    return { firm, score };
  });
  
  // Filter and sort by score
  return scored
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ firm }) => firm);
}

/**
 * Check if personal account matches query
 */
export function matchesPersonalAccount(query: string): boolean {
  if (!query.trim()) return false;
  
  const normalizedQuery = query.toLowerCase().trim();
  return PERSONAL_ACCOUNT.aliases.some(alias => 
    alias.includes(normalizedQuery) || normalizedQuery.includes(alias)
  );
}

/**
 * Get initials for firm avatar
 */
export function getFirmInitials(name: string): string {
  const words = name.split(' ').filter(w => w.length > 0);
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }
  return words.slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

/**
 * Find firm by ID
 */
export function getFirmById(id: string): PropFirm | typeof PERSONAL_ACCOUNT | undefined {
  if (id === 'personal') return PERSONAL_ACCOUNT;
  return PROP_FIRMS.find(firm => firm.id === id);
}
