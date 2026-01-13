/**
 * Contract Specifications
 * 
 * Official CME Group contract specs for futures instruments.
 * Used by Smart Tools for accurate risk calculations.
 * 
 * Source: CME Group (as of 2025)
 * Created: January 13, 2026
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ContractSpec {
  symbol: string;
  fullName: string;
  pointValue: number;      // Dollar value per point
  tickSize: number;        // Minimum price movement
  tickValue: number;       // Dollar value per tick
  microVersion?: string;   // Symbol of micro version (if full-size)
  fullVersion?: string;    // Symbol of full version (if micro)
  exchange: 'CME' | 'CBOT' | 'NYMEX' | 'COMEX';
  tradingHours: {
    open: string;          // ET time
    close: string;         // ET time
  };
}

export interface ATRInfo {
  min: number;
  typical: number;
  max: number;
  description: string;
}

// ============================================================================
// CONTRACT SPECIFICATIONS
// ============================================================================

export const CONTRACT_SPECS: Record<string, ContractSpec> = {
  // E-mini Nasdaq-100
  NQ: {
    symbol: 'NQ',
    fullName: 'E-mini Nasdaq-100',
    pointValue: 20,
    tickSize: 0.25,
    tickValue: 5.00,
    microVersion: 'MNQ',
    exchange: 'CME',
    tradingHours: { open: '18:00', close: '17:00' }
  },
  MNQ: {
    symbol: 'MNQ',
    fullName: 'Micro E-mini Nasdaq-100',
    pointValue: 2,
    tickSize: 0.25,
    tickValue: 0.50,
    fullVersion: 'NQ',
    exchange: 'CME',
    tradingHours: { open: '18:00', close: '17:00' }
  },
  
  // E-mini S&P 500
  ES: {
    symbol: 'ES',
    fullName: 'E-mini S&P 500',
    pointValue: 50,
    tickSize: 0.25,
    tickValue: 12.50,
    microVersion: 'MES',
    exchange: 'CME',
    tradingHours: { open: '18:00', close: '17:00' }
  },
  MES: {
    symbol: 'MES',
    fullName: 'Micro E-mini S&P 500',
    pointValue: 5,
    tickSize: 0.25,
    tickValue: 1.25,
    fullVersion: 'ES',
    exchange: 'CME',
    tradingHours: { open: '18:00', close: '17:00' }
  },
  
  // E-mini Dow
  YM: {
    symbol: 'YM',
    fullName: 'E-mini Dow',
    pointValue: 5,
    tickSize: 1.00,
    tickValue: 5.00,
    microVersion: 'MYM',
    exchange: 'CBOT',
    tradingHours: { open: '18:00', close: '17:00' }
  },
  MYM: {
    symbol: 'MYM',
    fullName: 'Micro E-mini Dow',
    pointValue: 0.50,
    tickSize: 1.00,
    tickValue: 0.50,
    fullVersion: 'YM',
    exchange: 'CBOT',
    tradingHours: { open: '18:00', close: '17:00' }
  },
  
  // E-mini Russell 2000
  RTY: {
    symbol: 'RTY',
    fullName: 'E-mini Russell 2000',
    pointValue: 50,
    tickSize: 0.10,
    tickValue: 5.00,
    microVersion: 'M2K',
    exchange: 'CME',
    tradingHours: { open: '18:00', close: '17:00' }
  },
  M2K: {
    symbol: 'M2K',
    fullName: 'Micro E-mini Russell 2000',
    pointValue: 5,
    tickSize: 0.10,
    tickValue: 0.50,
    fullVersion: 'RTY',
    exchange: 'CME',
    tradingHours: { open: '18:00', close: '17:00' }
  },
  
  // Crude Oil
  CL: {
    symbol: 'CL',
    fullName: 'Crude Oil',
    pointValue: 1000,
    tickSize: 0.01,
    tickValue: 10.00,
    microVersion: 'MCL',
    exchange: 'NYMEX',
    tradingHours: { open: '18:00', close: '17:00' }
  },
  MCL: {
    symbol: 'MCL',
    fullName: 'Micro Crude Oil',
    pointValue: 100,
    tickSize: 0.01,
    tickValue: 1.00,
    fullVersion: 'CL',
    exchange: 'NYMEX',
    tradingHours: { open: '18:00', close: '17:00' }
  },
  
  // Gold
  GC: {
    symbol: 'GC',
    fullName: 'Gold',
    pointValue: 100,
    tickSize: 0.10,
    tickValue: 10.00,
    microVersion: 'MGC',
    exchange: 'COMEX',
    tradingHours: { open: '18:00', close: '17:00' }
  },
  MGC: {
    symbol: 'MGC',
    fullName: 'Micro Gold',
    pointValue: 10,
    tickSize: 0.10,
    tickValue: 1.00,
    fullVersion: 'GC',
    exchange: 'COMEX',
    tradingHours: { open: '18:00', close: '17:00' }
  },
};

// ============================================================================
// TYPICAL ATR VALUES (14-period)
// ============================================================================

export const TYPICAL_ATR: Record<string, ATRInfo> = {
  // E-mini Indices
  NQ: {
    min: 12,
    typical: 15,
    max: 18,
    description: 'Regular trading hours. Overnight can be 8-10 ticks.'
  },
  MNQ: {
    min: 12,
    typical: 15,
    max: 18,
    description: 'Same volatility as NQ, just smaller dollar value.'
  },
  ES: {
    min: 8,
    typical: 10,
    max: 12,
    description: 'Lower volatility than NQ. Overnight 5-7 ticks.'
  },
  MES: {
    min: 8,
    typical: 10,
    max: 12,
    description: 'Same volatility as ES, just smaller dollar value.'
  },
  YM: {
    min: 80,
    typical: 100,
    max: 120,
    description: 'Large tick size (1.0). Lower volatility.'
  },
  MYM: {
    min: 80,
    typical: 100,
    max: 120,
    description: 'Same volatility as YM, just smaller dollar value.'
  },
  RTY: {
    min: 8,
    typical: 10,
    max: 13,
    description: 'Small caps = high volatility. Can spike to 15+.'
  },
  M2K: {
    min: 8,
    typical: 10,
    max: 13,
    description: 'Same volatility as RTY, just smaller dollar value.'
  },
  
  // Commodities
  CL: {
    min: 60,
    typical: 80,
    max: 100,
    description: 'Crude oil swings hard. News events can double ATR.'
  },
  MCL: {
    min: 60,
    typical: 80,
    max: 100,
    description: 'Same volatility as CL, just smaller dollar value.'
  },
  GC: {
    min: 40,
    typical: 50,
    max: 70,
    description: 'Gold less volatile than oil. Safe haven = lower ATR.'
  },
  MGC: {
    min: 40,
    typical: 50,
    max: 70,
    description: 'Same volatility as GC, just smaller dollar value.'
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get contract specification by symbol.
 * 
 * @param symbol - Contract symbol (e.g., "NQ", "MES")
 * @returns ContractSpec or null if not found
 */
export function getContractSpec(symbol: string): ContractSpec | null {
  const spec = CONTRACT_SPECS[symbol.toUpperCase()];
  return spec || null;
}

/**
 * Get typical ATR info for an instrument.
 * 
 * @param instrument - Contract symbol
 * @returns ATR info with typical value, range, and description
 */
export function getTypicalATR(instrument: string): {
  value: number;
  range: string;
  description: string;
} {
  const atr = TYPICAL_ATR[instrument.toUpperCase()];
  if (!atr) {
    return {
      value: 10,
      range: 'Unknown',
      description: 'Check your chart for current ATR',
    };
  }
  
  return {
    value: atr.typical,
    range: `${atr.min}-${atr.max} ticks`,
    description: atr.description,
  };
}

/**
 * Calculate dollar value for a number of ticks.
 * 
 * @param symbol - Contract symbol
 * @param ticks - Number of ticks
 * @returns Dollar value
 */
export function calculateTickValue(symbol: string, ticks: number): number {
  const spec = getContractSpec(symbol);
  if (!spec) return 0;
  return ticks * spec.tickValue;
}

/**
 * Calculate number of contracts based on risk amount and stop loss.
 * 
 * @param symbol - Contract symbol
 * @param riskAmount - Total dollar risk
 * @param stopLossTicks - Stop loss in ticks
 * @returns Number of contracts (floored)
 */
export function calculateContracts(
  symbol: string,
  riskAmount: number,
  stopLossTicks: number
): number {
  const riskPerContract = calculateTickValue(symbol, stopLossTicks);
  if (riskPerContract <= 0) return 0;
  return Math.floor(riskAmount / riskPerContract);
}

/**
 * Get the micro or full version of a contract.
 * 
 * @param symbol - Contract symbol
 * @returns Related contract symbol or null
 */
export function getRelatedContract(symbol: string): {
  symbol: string;
  type: 'micro' | 'full';
} | null {
  const spec = getContractSpec(symbol);
  if (!spec) return null;
  
  if (spec.microVersion) {
    return { symbol: spec.microVersion, type: 'micro' };
  }
  if (spec.fullVersion) {
    return { symbol: spec.fullVersion, type: 'full' };
  }
  return null;
}

/**
 * Get all available instruments grouped by type.
 */
export function getInstrumentGroups(): Record<string, string[]> {
  return {
    'E-mini Indices': ['NQ', 'ES', 'YM', 'RTY'],
    'Micro Indices': ['MNQ', 'MES', 'MYM', 'M2K'],
    'Energy': ['CL', 'MCL'],
    'Metals': ['GC', 'MGC'],
  };
}

/**
 * Check if a symbol is a micro contract.
 */
export function isMicroContract(symbol: string): boolean {
  const spec = getContractSpec(symbol);
  return spec?.fullVersion !== undefined;
}
