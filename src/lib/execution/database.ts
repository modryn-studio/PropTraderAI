/**
 * Database Pool Singleton
 * 
 * Provides a single database connection to be shared across all execution
 * layer components. This prevents connection exhaustion under load.
 * 
 * Critical fix identified in Agent 1 code review:
 * - Without pooling, 5 strategies × 1 check/sec = 300 queries/minute
 * - Each creates new connection → connection overhead ~50ms
 * - Supabase free tier: max 60 connections
 * - Would hit limits at 12 strategies
 * 
 * @module lib/execution/database
 * @see Issue #10 - Agent 1 Code Review, Issue #1
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Singleton database pool for execution layer
 * Reuses single connection across all components
 */
class DatabasePool {
  private static instance: DatabasePool;
  private client: SupabaseClient | null = null;
  private initialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): DatabasePool {
    if (!DatabasePool.instance) {
      DatabasePool.instance = new DatabasePool();
    }
    return DatabasePool.instance;
  }

  /**
   * Initialize the database connection
   * Safe to call multiple times - only initializes once
   */
  async initialize(): Promise<SupabaseClient> {
    if (this.initialized && this.client) {
      return this.client;
    }

    // Prevent race condition during initialization
    if (this.initializationPromise) {
      await this.initializationPromise;
      return this.client!;
    }

    this.initializationPromise = this._doInitialize();
    await this.initializationPromise;
    return this.client!;
  }

  private async _doInitialize(): Promise<void> {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables');
    }

    this.client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      db: {
        schema: 'public',
      },
      global: {
        headers: {
          'x-application-name': 'proptraderai-execution',
        },
      },
    });

    this.initialized = true;
    console.log('[DatabasePool] Initialized Supabase client');
  }

  /**
   * Get the database client
   * Throws if not initialized - call initialize() first
   */
  getClient(): SupabaseClient {
    if (!this.initialized || !this.client) {
      throw new Error('DatabasePool not initialized. Call initialize() first.');
    }
    return this.client;
  }

  /**
   * Check if pool is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Health check - verify database connection is alive
   */
  async healthCheck(): Promise<{ healthy: boolean; latencyMs: number; error?: string }> {
    const startTime = Date.now();
    
    try {
      if (!this.initialized || !this.client) {
        return { healthy: false, latencyMs: 0, error: 'Not initialized' };
      }

      // Simple query to verify connection
      const { error } = await this.client
        .from('strategies')
        .select('id')
        .limit(1);

      if (error) {
        return { 
          healthy: false, 
          latencyMs: Date.now() - startTime, 
          error: error.message 
        };
      }

      return { 
        healthy: true, 
        latencyMs: Date.now() - startTime 
      };
    } catch (error) {
      return { 
        healthy: false, 
        latencyMs: Date.now() - startTime, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Reset the pool (for testing only)
   */
  reset(): void {
    this.client = null;
    this.initialized = false;
    this.initializationPromise = null;
  }
}

/**
 * Get the shared database pool instance
 */
export function getDatabasePool(): DatabasePool {
  return DatabasePool.getInstance();
}

/**
 * Get an initialized database client
 * Convenience function that handles initialization
 */
export async function getDatabase(): Promise<SupabaseClient> {
  const pool = getDatabasePool();
  return pool.initialize();
}

/**
 * Get database client (sync version)
 * Only use after ensuring pool is initialized
 */
export function getDatabaseSync(): SupabaseClient {
  return getDatabasePool().getClient();
}

export { DatabasePool };
