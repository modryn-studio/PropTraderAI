/**
 * Feature Flags Hook
 * 
 * Provides access to user-specific feature flags for A/B testing and gradual rollout.
 * Part of Week 2 Rapid Flow integration.
 * 
 * Usage:
 * ```tsx
 * const { flags, hasFlag, isLoading } = useFeatureFlags();
 * const useRapidFlow = flags.generate_first_flow ?? false;
 * ```
 */

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface FeatureFlags {
  generate_first_flow?: boolean;
  // Add more feature flags as needed
  [key: string]: boolean | undefined;
}

interface UseFeatureFlagsReturn {
  /** User's feature flags object */
  flags: FeatureFlags;
  /** Check if a specific flag is enabled */
  hasFlag: (flag: string) => boolean;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
}

/**
 * Hook to access user feature flags
 * 
 * For development, flags default to false if not set.
 * In production, use A/B assignment trigger on signup.
 */
export function useFeatureFlags(): UseFeatureFlagsReturn {
  const [flags, setFlags] = useState<FeatureFlags>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function loadFeatureFlags() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setIsLoading(false);
          return;
        }

        // Check if user_preferences table exists and has feature_flags column
        // For now, we'll use a simple approach - check profiles table for feature_flags
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('feature_flags')
          .eq('id', user.id)
          .single();

        if (profileError) {
          // Column might not exist yet - return empty flags
          console.info('[FeatureFlags] feature_flags column not found, using defaults');
          setFlags({});
          setIsLoading(false);
          return;
        }

        // Parse feature_flags JSONB column
        const parsedFlags = (profile?.feature_flags as FeatureFlags) || {};
        setFlags(parsedFlags);
      } catch (err) {
        console.error('[FeatureFlags] Error loading flags:', err);
        setError(err instanceof Error ? err : new Error('Failed to load feature flags'));
      } finally {
        setIsLoading(false);
      }
    }

    loadFeatureFlags();
  }, []);

  const hasFlag = (flag: string): boolean => {
    return flags[flag] === true;
  };

  return {
    flags,
    hasFlag,
    isLoading,
    error,
  };
}

/**
 * Dev-only: Override feature flags for testing
 * 
 * Usage in ChatInterface:
 * ```tsx
 * const isDev = process.env.NODE_ENV === 'development';
 * const [devOverride, setDevOverride] = useState(false);
 * const useRapidFlow = isDev ? devOverride : flags.generate_first_flow ?? false;
 * ```
 */
export function useFeatureFlagOverride(_flagName: string) {
  const [override, setOverride] = useState<boolean | null>(null);

  // Only allow overrides in development
  const isDev = process.env.NODE_ENV === 'development';

  return {
    override: isDev ? override : null,
    setOverride: isDev ? setOverride : () => {},
    isDevMode: isDev,
  };
}
