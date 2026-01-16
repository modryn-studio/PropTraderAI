/**
 * Circuit Breaker Pattern Implementation
 * 
 * Prevents cascading failures when Tradovate API is down.
 * Opens after N failures, closes after timeout + successful request.
 * 
 * @module lib/execution/circuitBreaker
 * @see Issue #10 - Architectural Concern #2
 */

import {
  CircuitBreakerState,
  CircuitBreakerConfig,
  CircuitBreakerStatus,
  CircuitBreakerError,
} from './types';

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,    // Open after 5 failures
  timeout: 60000,         // Try again after 1 minute
  successThreshold: 2,    // Need 2 successes to fully close
};

export class CircuitBreaker {
  private state: CircuitBreakerState = 'CLOSED';
  private failures: number = 0;
  private successes: number = 0;
  private lastFailureTime: Date | null = null;
  private lastSuccessTime: Date | null = null;
  private config: CircuitBreakerConfig;
  private name: string;

  constructor(name: string, config: Partial<CircuitBreakerConfig> = {}) {
    this.name = name;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state === 'OPEN') {
      // Check if timeout has elapsed
      if (this.shouldAttemptReset()) {
        this.state = 'HALF_OPEN';
        console.log(`[CircuitBreaker:${this.name}] Transitioning to HALF_OPEN`);
      } else {
        const nextRetry = this.getNextRetryTime();
        throw new CircuitBreakerError(
          `Circuit breaker ${this.name} is OPEN - API is unavailable`,
          nextRetry
        );
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  /**
   * Record a successful operation
   */
  private onSuccess(): void {
    this.lastSuccessTime = new Date();

    if (this.state === 'HALF_OPEN') {
      this.successes++;
      
      if (this.successes >= this.config.successThreshold) {
        this.reset();
        console.log(`[CircuitBreaker:${this.name}] Circuit CLOSED after ${this.config.successThreshold} successes`);
      }
    } else {
      // In CLOSED state, reset failure count on success
      this.failures = 0;
    }
  }

  /**
   * Record a failed operation
   */
  private onFailure(error: unknown): void {
    this.failures++;
    this.lastFailureTime = new Date();
    this.successes = 0; // Reset success counter

    console.error(`[CircuitBreaker:${this.name}] Failure #${this.failures}:`, error);

    if (this.state === 'HALF_OPEN') {
      // Any failure in HALF_OPEN immediately opens the circuit
      this.state = 'OPEN';
      console.warn(`[CircuitBreaker:${this.name}] Circuit OPENED (failed in HALF_OPEN)`);
    } else if (this.failures >= this.config.failureThreshold) {
      // Open circuit after threshold reached
      this.state = 'OPEN';
      console.warn(`[CircuitBreaker:${this.name}] Circuit OPENED after ${this.failures} failures`);
    }
  }

  /**
   * Check if enough time has passed to attempt reset
   */
  private shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) return true;
    
    const elapsed = Date.now() - this.lastFailureTime.getTime();
    return elapsed >= this.config.timeout;
  }

  /**
   * Get the next retry time
   */
  private getNextRetryTime(): Date | undefined {
    if (!this.lastFailureTime) return undefined;
    return new Date(this.lastFailureTime.getTime() + this.config.timeout);
  }

  /**
   * Reset the circuit breaker to closed state
   */
  reset(): void {
    this.state = 'CLOSED';
    this.failures = 0;
    this.successes = 0;
  }

  /**
   * Force the circuit open (for emergency stops)
   */
  forceOpen(): void {
    this.state = 'OPEN';
    this.lastFailureTime = new Date();
    console.warn(`[CircuitBreaker:${this.name}] Circuit FORCE OPENED`);
  }

  /**
   * Get current status
   */
  getStatus(): CircuitBreakerStatus {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailure: this.lastFailureTime || undefined,
      lastSuccess: this.lastSuccessTime || undefined,
      nextRetry: this.state === 'OPEN' ? this.getNextRetryTime() : undefined,
    };
  }

  /**
   * Check if circuit is available for requests
   */
  isAvailable(): boolean {
    if (this.state === 'CLOSED') return true;
    if (this.state === 'HALF_OPEN') return true;
    if (this.state === 'OPEN' && this.shouldAttemptReset()) return true;
    return false;
  }
}

// ============================================================================
// CIRCUIT BREAKER REGISTRY
// ============================================================================

/**
 * Global registry for circuit breakers
 * Allows sharing circuit breakers across components
 */
class CircuitBreakerRegistry {
  private breakers: Map<string, CircuitBreaker> = new Map();

  /**
   * Get or create a circuit breaker by name
   */
  get(name: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    if (!this.breakers.has(name)) {
      this.breakers.set(name, new CircuitBreaker(name, config));
    }
    return this.breakers.get(name)!;
  }

  /**
   * Get all circuit breaker statuses
   */
  getAllStatuses(): Record<string, CircuitBreakerStatus> {
    const statuses: Record<string, CircuitBreakerStatus> = {};
    const entries = Array.from(this.breakers.entries());
    for (const [name, breaker] of entries) {
      statuses[name] = breaker.getStatus();
    }
    return statuses;
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    const breakers = Array.from(this.breakers.values());
    for (const breaker of breakers) {
      breaker.reset();
    }
  }

  /**
   * Force open all circuit breakers (emergency stop)
   */
  forceOpenAll(): void {
    const breakers = Array.from(this.breakers.values());
    for (const breaker of breakers) {
      breaker.forceOpen();
    }
  }
}

// Singleton instance
export const circuitBreakerRegistry = new CircuitBreakerRegistry();

// Pre-configured circuit breakers for common services
export const tradovateOrdersCircuitBreaker = circuitBreakerRegistry.get('tradovate:orders', {
  failureThreshold: 5,
  timeout: 60000,
  successThreshold: 2,
});

export const tradovateMarketDataCircuitBreaker = circuitBreakerRegistry.get('tradovate:marketData', {
  failureThreshold: 3,
  timeout: 30000,
  successThreshold: 1,
});

export const tradovateAuthCircuitBreaker = circuitBreakerRegistry.get('tradovate:auth', {
  failureThreshold: 3,
  timeout: 120000, // 2 minutes for auth issues
  successThreshold: 1,
});
