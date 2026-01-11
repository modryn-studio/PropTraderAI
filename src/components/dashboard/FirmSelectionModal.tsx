'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronRight, X, User, Loader2 } from 'lucide-react';
import {
  PropFirm,
  PERSONAL_ACCOUNT,
  getPopularFirms,
  searchFirms,
  matchesPersonalAccount,
  getFirmInitials,
} from '@/config/prop-firms';

interface FirmSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFirm: (firmId: string, firmName: string | null, isPersonal: boolean) => void;
  onRequestIntegration: (firmName: string) => void;
}

export default function FirmSelectionModal({
  isOpen,
  onClose,
  onSelectFirm,
  onRequestIntegration,
}: FirmSelectionModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectingFirm, setConnectingFirm] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Memoize search results to prevent dependency issues
  const searchResults = useMemo(() => 
    searchQuery.trim() ? searchFirms(searchQuery) : [], 
    [searchQuery]
  );
  const showPersonalInSearch = useMemo(() => 
    searchQuery.trim() ? matchesPersonalAccount(searchQuery) : false,
    [searchQuery]
  );
  const popularFirms = useMemo(() => getPopularFirms(), []);
  const hasResults = searchResults.length > 0 || showPersonalInSearch;
  const showNoResults = searchQuery.trim() && !hasResults;

  // Build the list of items for keyboard navigation
  const getNavigableItems = useCallback((): Array<{ type: 'firm' | 'personal' | 'request'; firm?: PropFirm }> => {
    if (searchQuery.trim()) {
      const items: Array<{ type: 'firm' | 'personal' | 'request'; firm?: PropFirm }> = [];
      searchResults.forEach(firm => items.push({ type: 'firm', firm }));
      if (showPersonalInSearch) items.push({ type: 'personal' });
      if (showNoResults) items.push({ type: 'request' });
      return items;
    } else {
      const items: Array<{ type: 'firm' | 'personal'; firm?: PropFirm }> = [];
      popularFirms.forEach(firm => items.push({ type: 'firm', firm }));
      items.push({ type: 'personal' });
      return items;
    }
  }, [searchQuery, searchResults, showPersonalInSearch, showNoResults, popularFirms]);

  const navigableItems = getNavigableItems();

  // Handler functions (defined before useEffect that uses them)
  const handleFirmSelect = useCallback((firmId: string, firmName: string) => {
    setIsConnecting(true);
    setConnectingFirm(firmName);
    // Small delay for visual feedback
    setTimeout(() => {
      onSelectFirm(firmId, firmName, false);
    }, 400);
  }, [onSelectFirm]);

  const handlePersonalSelect = useCallback(() => {
    setIsConnecting(true);
    setConnectingFirm('Personal Account');
    setTimeout(() => {
      onSelectFirm('personal', null, true);
    }, 400);
  }, [onSelectFirm]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setHighlightedIndex(0);
      setIsConnecting(false);
      setConnectingFirm(null);
      // Focus search input after animation
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Reset highlighted index when search changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchQuery]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < navigableItems.length - 1 ? prev + 1 : 0
        );
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : navigableItems.length - 1
        );
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        const item = navigableItems[highlightedIndex];
        if (item) {
          if (item.type === 'firm' && item.firm) {
            handleFirmSelect(item.firm.id, item.firm.name);
          } else if (item.type === 'personal') {
            handlePersonalSelect();
          } else if (item.type === 'request') {
            onRequestIntegration(searchQuery.trim());
          }
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, navigableItems, highlightedIndex, onClose, onRequestIntegration, searchQuery, handleFirmSelect, handlePersonalSelect]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (!listRef.current) return;
    const highlightedEl = listRef.current.querySelector('[data-highlighted="true"]');
    if (highlightedEl) {
      highlightedEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [highlightedIndex]);

  // Get current item index for highlighting
  let currentItemIndex = 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />

          {/* Modal Container - Handles Centering */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-md max-h-[85vh] bg-[#000000] border border-[rgba(255,255,255,0.1)] 
                         flex flex-col overflow-hidden pointer-events-auto"
            >
            {/* Connecting State Overlay */}
            <AnimatePresence>
              {isConnecting && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-[#000000]/95 z-10 flex flex-col items-center justify-center"
                >
                  <Loader2 className="w-10 h-10 text-[#00FFD1] animate-spin mb-4" />
                  <p className="font-mono text-white text-lg">
                    Connecting to {connectingFirm}...
                  </p>
                  <p className="text-[rgba(255,255,255,0.5)] text-sm mt-2">
                    Redirecting to Tradovate
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Header */}
            <div className="p-6 pb-4 border-b border-[rgba(255,255,255,0.1)]">
              <div className="flex items-start justify-between mb-4">
                <h2 className="font-mono font-bold text-xl text-white">
                  Which prop firm are you trading with?
                </h2>
                <button
                  onClick={onClose}
                  className="text-[rgba(255,255,255,0.5)] hover:text-white transition-colors p-1 -mt-1 -mr-1"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[rgba(255,255,255,0.4)]" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for your firm..."
                  className="w-full bg-white text-black pl-12 pr-4 py-3 font-mono text-sm
                             placeholder:text-[rgba(0,0,0,0.4)] focus:outline-none focus:ring-2 
                             focus:ring-[#00FFD1] border border-transparent"
                  autoComplete="off"
                />
              </div>
            </div>

            {/* Content */}
            <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-2">
              {/* Search Results Mode */}
              {searchQuery.trim() ? (
                <>
                  {searchResults.length > 0 && (
                    <>
                      {searchResults.map((firm) => {
                        const itemIndex = currentItemIndex++;
                        const isHighlighted = itemIndex === highlightedIndex;
                        return (
                          <FirmListItem
                            key={firm.id}
                            firm={firm}
                            isHighlighted={isHighlighted}
                            onClick={() => handleFirmSelect(firm.id, firm.name)}
                          />
                        );
                      })}
                    </>
                  )}

                  {showPersonalInSearch && (
                    <>
                      {(() => {
                        const itemIndex = currentItemIndex++;
                        const isHighlighted = itemIndex === highlightedIndex;
                        return (
                          <PersonalAccountItem
                            isHighlighted={isHighlighted}
                            onClick={handlePersonalSelect}
                          />
                        );
                      })()}
                    </>
                  )}

                  {showNoResults && (
                    <div className="py-8 text-center">
                      <p className="text-[rgba(255,255,255,0.5)] mb-4">
                        No firms found for &quot;{searchQuery}&quot;
                      </p>
                      {(() => {
                        const itemIndex = currentItemIndex++;
                        const isHighlighted = itemIndex === highlightedIndex;
                        return (
                          <button
                            onClick={() => onRequestIntegration(searchQuery.trim())}
                            data-highlighted={isHighlighted}
                            className={`font-mono text-sm px-4 py-2 transition-all
                                       ${isHighlighted 
                                         ? 'text-[#00FFD1] bg-[rgba(0,255,209,0.1)]' 
                                         : 'text-[#00FFD1] hover:bg-[rgba(0,255,209,0.1)]'}`}
                          >
                            Request &quot;{searchQuery}&quot; Integration →
                          </button>
                        );
                      })()}
                    </div>
                  )}
                </>
              ) : (
                /* Default Mode - Popular Choices */
                <>
                  <p className="text-[rgba(255,255,255,0.5)] text-sm font-mono mb-3 px-1">
                    Popular Choices
                  </p>
                  
                  {popularFirms.map((firm) => {
                    const itemIndex = currentItemIndex++;
                    const isHighlighted = itemIndex === highlightedIndex;
                    return (
                      <FirmListItem
                        key={firm.id}
                        firm={firm}
                        isHighlighted={isHighlighted}
                        onClick={() => handleFirmSelect(firm.id, firm.name)}
                      />
                    );
                  })}

                  <div className="my-4 border-t border-[rgba(255,255,255,0.1)]" />

                  {(() => {
                    const itemIndex = currentItemIndex++;
                    const isHighlighted = itemIndex === highlightedIndex;
                    return (
                      <PersonalAccountItem
                        isHighlighted={isHighlighted}
                        onClick={handlePersonalSelect}
                      />
                    );
                  })()}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[rgba(255,255,255,0.1)]">
              <p className="text-xs text-[rgba(255,255,255,0.4)] text-center">
                Don&apos;t see your firm?{' '}
                <button 
                  onClick={() => onRequestIntegration(searchQuery.trim() || 'Unknown Firm')}
                  className="text-[#00FFD1] hover:underline"
                >
                  Request it →
                </button>
              </p>
            </div>
          </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

// Firm list item component
interface FirmListItemProps {
  firm: PropFirm;
  isHighlighted: boolean;
  onClick: () => void;
}

function FirmListItem({ firm, isHighlighted, onClick }: FirmListItemProps) {
  const initials = getFirmInitials(firm.displayName);
  
  return (
    <button
      onClick={onClick}
      data-highlighted={isHighlighted}
      className={`w-full flex items-center gap-4 p-3 transition-all
                 ${isHighlighted 
                   ? 'bg-[rgba(0,255,209,0.1)] border border-[#00FFD1]' 
                   : 'bg-[#0a0a0a] border border-[rgba(255,255,255,0.1)] hover:border-[rgba(255,255,255,0.2)]'}`}
    >
      {/* Initials Avatar */}
      <div 
        className="w-10 h-10 flex items-center justify-center font-mono font-bold text-sm text-white"
        style={{ backgroundColor: firm.color }}
      >
        {initials}
      </div>
      
      {/* Name */}
      <span className="flex-1 font-mono text-white text-left">
        {firm.displayName}
      </span>
      
      {/* Arrow */}
      <ChevronRight className={`w-5 h-5 transition-colors
                               ${isHighlighted ? 'text-[#00FFD1]' : 'text-[rgba(255,255,255,0.3)]'}`} />
    </button>
  );
}

// Personal account item component
interface PersonalAccountItemProps {
  isHighlighted: boolean;
  onClick: () => void;
}

function PersonalAccountItem({ isHighlighted, onClick }: PersonalAccountItemProps) {
  return (
    <button
      onClick={onClick}
      data-highlighted={isHighlighted}
      className={`w-full flex items-center gap-4 p-3 transition-all
                 ${isHighlighted 
                   ? 'bg-[rgba(0,255,209,0.1)] border border-[#00FFD1]' 
                   : 'bg-[#0a0a0a] border border-[rgba(255,255,255,0.1)] hover:border-[rgba(255,255,255,0.2)]'}`}
    >
      {/* Icon */}
      <div 
        className="w-10 h-10 flex items-center justify-center"
        style={{ backgroundColor: PERSONAL_ACCOUNT.color }}
      >
        <User className="w-5 h-5 text-white" />
      </div>
      
      {/* Name */}
      <span className="flex-1 font-mono text-white text-left">
        {PERSONAL_ACCOUNT.displayName}
      </span>
      
      {/* Arrow */}
      <ChevronRight className={`w-5 h-5 transition-colors
                               ${isHighlighted ? 'text-[#00FFD1]' : 'text-[rgba(255,255,255,0.3)]'}`} />
    </button>
  );
}
