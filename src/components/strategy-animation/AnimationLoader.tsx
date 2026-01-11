'use client';

import { lazy, Suspense } from 'react';
import { AnimationConfig } from './taxonomy';

const AnimationContainer = lazy(() => import('./AnimationContainer'));

interface AnimationLoaderProps {
  config: AnimationConfig | null;
  /** External control: is animation expanded/visible? */
  isExpanded?: boolean;
  /** Callback when animation expand/collapse state changes */
  onExpandedChange?: (expanded: boolean) => void;
  /** Whether this expansion was triggered manually by user vs auto-triggered */
  wasManuallySet?: boolean;
}

/**
 * Lazy loader wrapper for animation system
 * 
 * Only loads animation components when needed,
 * reducing initial bundle size for /chat page.
 * 
 * Now supports external state control for integration with Summary Panel:
 * - isExpanded: Control visibility from parent
 * - onExpandedChange: Notify parent of visibility changes
 * - wasManuallySet: Track if user manually toggled (for smart minimize behavior)
 */
export default function AnimationLoader({ 
  config,
  isExpanded,
  onExpandedChange,
  wasManuallySet,
}: AnimationLoaderProps) {
  // Don't render anything if no config (prevents loading unused components)
  if (!config) return null;

  return (
    <Suspense fallback={null}>
      <AnimationContainer 
        config={config} 
        desktopPosition="sidebar"
        isExpanded={isExpanded}
        onExpandedChange={onExpandedChange}
        wasManuallySet={wasManuallySet}
      />
    </Suspense>
  );
}
