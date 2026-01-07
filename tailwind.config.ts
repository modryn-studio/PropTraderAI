import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Base - Terminal Black
        bg: {
          primary: '#0a0e14',
          secondary: '#12171f',
          tertiary: '#1a2029',
        },
        // Borders - Subtle Containment
        line: {
          subtle: '#1f2633',
          DEFAULT: '#2d3544',
          strong: '#3d4555',
        },
        // Text - Hierarchy
        content: {
          primary: '#e6edf3',
          secondary: '#8b949e',
          tertiary: '#6e7681',
          inverse: '#0a0e14',
        },
        // Data - Financial Truth
        profit: '#00897b',
        loss: '#b5323d',
        neutral: '#64748b',
        warning: '#f59e0b',
        // Accent - Intelligence
        accent: {
          cyan: '#00bbd4',
          purple: '#8b5cf6',
          blue: '#3b82f6',
        },
        // Status
        success: '#00897b',
        error: '#b5323d',
        info: '#0ea5e9',
      },
      fontFamily: {
        display: ['Space Mono', 'IBM Plex Mono', 'Courier New', 'monospace'],
        body: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        data: ['JetBrains Mono', 'Fira Code', 'SF Mono', 'monospace'],
      },
      fontSize: {
        'xs': '0.75rem',
        'sm': '0.875rem',
        'base': '1rem',
        'lg': '1.125rem',
        'xl': '1.25rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
        '4xl': '2.5rem',
      },
      spacing: {
        'safe': 'env(safe-area-inset-bottom)',
      },
      borderRadius: {
        'sm': '0.25rem',
        'md': '0.5rem',
        'lg': '0.75rem',
        'xl': '1rem',
      },
      boxShadow: {
        'glow-blue': '0 0 20px rgba(59, 130, 246, 0.3)',
        'glow-green': '0 0 20px rgba(0, 137, 123, 0.3)',
        'glow-red': '0 0 20px rgba(181, 50, 61, 0.3)',
        'glow-purple': '0 0 20px rgba(139, 92, 246, 0.3)',
        'glow-cyan': '0 0 20px rgba(0, 187, 212, 0.3)',
      },
      animation: {
        'shimmer': 'shimmer 2s linear infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'typing': 'typing 1s steps(3) infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        typing: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
