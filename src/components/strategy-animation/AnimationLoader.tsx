'use client';

import { lazy, Suspense } from 'react';
import { AnimationConfig } from './taxonomy';

const AnimationContainer = lazy(() => import('./AnimationContainer'));

interface AnimationLoaderProps {
  config: AnimationConfig | null;
}

/**
 * Lazy loader wrapper for animation system
 * 
 * Only loads animation components when needed,
 * reducing initial bundle size for /chat page.
 */
export default function AnimationLoader({ 
  config,
}: AnimationLoaderProps) {
  // Don't render anything if no config (prevents loading unused components)
  if (!config) return null;

  return (
    <Suspense fallback={null}>
      <AnimationContainer 
        config={config} 
        desktopPosition="sidebar"
      />
    </Suspense>
  );
}
