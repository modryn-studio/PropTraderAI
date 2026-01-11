'use client';

import { createContext, useContext, ReactNode } from 'react';

interface UserContextType {
  userId: string | null;
}

const UserContext = createContext<UserContextType>({ userId: null });

interface UserProviderProps {
  children: ReactNode;
  userId: string | null;
}

/**
 * User Context Provider
 * 
 * Provides user ID to deeply nested components without prop drilling.
 * Used by animation system for behavioral event logging.
 */
export function UserProvider({ children, userId }: UserProviderProps) {
  return (
    <UserContext.Provider value={{ userId }}>
      {children}
    </UserContext.Provider>
  );
}

/**
 * Hook to access user context
 * 
 * @example
 * ```tsx
 * const { userId } = useUser();
 * if (userId) {
 *   logBehavioralEvent(userId, 'animation_viewed', {...});
 * }
 * ```
 */
export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

export default UserContext;
