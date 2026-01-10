'use client';

export interface PropFirmInfo {
  id: string;
  name: string;
  displayName: string;
  logo: string;
  bgColor: string;
  description: string;
}

// Supported prop firms with their details
export const PROP_FIRMS: PropFirmInfo[] = [
  {
    id: 'topstep',
    name: 'topstep',
    displayName: 'Topstep',
    logo: '/firms/topstep.svg',
    bgColor: 'rgba(0, 184, 217, 0.1)',
    description: 'Most established',
  },
  {
    id: 'tradeify',
    name: 'tradeify',
    displayName: 'Tradeify',
    logo: '/firms/tradeify.svg',
    bgColor: 'rgba(139, 92, 246, 0.1)',
    description: 'One-time fee',
  },
  {
    id: 'myfundedfutures',
    name: 'myfundedfutures',
    displayName: 'My Funded Futures',
    logo: '/firms/mff.svg',
    bgColor: 'rgba(16, 185, 129, 0.1)',
    description: 'Automation allowed',
  },
  {
    id: 'alpha-futures',
    name: 'alpha-futures',
    displayName: 'Alpha Futures',
    logo: '/firms/alpha.svg',
    bgColor: 'rgba(245, 158, 11, 0.1)',
    description: 'Bots/EAs allowed',
  },
];

// Personal account option (separate from prop firms)
export const PERSONAL_ACCOUNT: PropFirmInfo = {
  id: 'personal',
  name: 'personal',
  displayName: 'Personal Account',
  logo: '/tradovate-logo.png',
  bgColor: 'rgba(255, 255, 255, 0.05)',
  description: 'Trade your own capital',
};

interface PropFirmCardProps {
  firm: PropFirmInfo;
  onConnect: (firmId: string) => void;
  isPersonal?: boolean;
}

export function PropFirmCard({ firm, onConnect, isPersonal = false }: PropFirmCardProps) {
  return (
    <button
      onClick={() => onConnect(firm.id)}
      className={`
        group relative flex flex-col items-center p-4 rounded-lg border border-[rgba(255,255,255,0.1)]
        hover:border-[#00FFD1] hover:bg-[rgba(0,255,209,0.05)] transition-all duration-200
        ${isPersonal ? 'col-span-full sm:col-span-1' : ''}
      `}
      style={{ backgroundColor: firm.bgColor }}
    >
      {/* Logo */}
      <div className="w-16 h-16 flex items-center justify-center mb-3 rounded-lg bg-[rgba(255,255,255,0.05)] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={firm.logo}
          alt={firm.displayName}
          className="w-12 h-12 object-contain"
        />
      </div>
      
      {/* Firm name */}
      <h3 className="font-mono font-bold text-white text-sm mb-1">
        {firm.displayName}
      </h3>
      
      {/* Description */}
      <p className="text-xs text-[rgba(255,255,255,0.5)] mb-3">
        {firm.description}
      </p>
      
      {/* Connect button */}
      <span className="text-xs font-mono text-[#00FFD1] group-hover:underline">
        Connect →
      </span>
    </button>
  );
}

interface PropFirmGridProps {
  onSelectFirm: (firmId: string) => void;
}

export function PropFirmGrid({ onSelectFirm }: PropFirmGridProps) {
  return (
    <div className="space-y-4">
      {/* Prop firms grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {PROP_FIRMS.map((firm) => (
          <PropFirmCard
            key={firm.id}
            firm={firm}
            onConnect={onSelectFirm}
          />
        ))}
      </div>
      
      {/* Personal account - separate section */}
      <div className="pt-4 border-t border-[rgba(255,255,255,0.1)]">
        <p className="text-xs text-[rgba(255,255,255,0.5)] mb-3 text-center">
          Trading your own capital?
        </p>
        <div className="max-w-[200px] mx-auto">
          <PropFirmCard
            firm={PERSONAL_ACCOUNT}
            onConnect={onSelectFirm}
            isPersonal
          />
        </div>
      </div>
      
      {/* Missing firm note */}
      <p className="text-xs text-[rgba(255,255,255,0.4)] text-center pt-2">
        Don&apos;t see your firm? We&apos;re adding more soon.
      </p>
    </div>
  );
}
