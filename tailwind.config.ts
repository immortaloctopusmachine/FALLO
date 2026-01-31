import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Base palette
        background: 'var(--background)',
        surface: 'var(--surface)',
        'surface-raised': 'var(--surface-raised)',
        'surface-hover': 'var(--surface-hover)',
        border: 'var(--border)',
        'border-subtle': 'var(--border-subtle)',
        
        // Text
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-tertiary': 'var(--text-tertiary)',
        'text-inverse': 'var(--text-inverse)',
        
        // Card type colors
        'card-task': '#3B82F6',
        'card-task-bg': '#EFF6FF',
        'card-task-border': '#BFDBFE',
        'card-story': '#22C55E',
        'card-story-bg': '#F0FDF4',
        'card-story-border': '#BBF7D0',
        'card-epic': '#A855F7',
        'card-epic-bg': '#FAF5FF',
        'card-epic-border': '#E9D5FF',
        'card-utility': '#6B7280',
        'card-utility-bg': '#F9FAFB',
        'card-utility-border': '#E5E7EB',
        
        // Semantic
        success: '#22C55E',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#3B82F6',
      },
      spacing: {
        'card': '8px',
        'xs': '4px',
        'sm': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '24px',
        '2xl': '32px',
      },
      width: {
        'list': '280px',
        'modal-content': '480px',
        'modal-sidebar': '200px',
      },
      maxWidth: {
        'modal': '1200px',
      },
      borderRadius: {
        'card': '6px',
        'list': '8px',
        'modal': '12px',
      },
      fontSize: {
        'display': ['24px', { lineHeight: '1.2', fontWeight: '600' }],
        'heading': ['18px', { lineHeight: '1.3', fontWeight: '600' }],
        'title': ['14px', { lineHeight: '1.4', fontWeight: '600' }],
        'body': ['14px', { lineHeight: '1.5', fontWeight: '400' }],
        'caption': ['12px', { lineHeight: '1.4', fontWeight: '400' }],
        'tiny': ['10px', { lineHeight: '1.2', fontWeight: '500' }],
      },
      boxShadow: {
        'modal': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        'card-drag': '0 10px 20px rgba(0, 0, 0, 0.15)',
      },
      transitionTimingFunction: {
        'ease-out': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'ease-in-out': 'cubic-bezier(0.65, 0, 0.35, 1)',
      },
      transitionDuration: {
        'micro': '100ms',
        'standard': '200ms',
        'complex': '300ms',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 200ms ease-out',
        'scale-in': 'scale-in 200ms ease-out',
        'slide-up': 'slide-up 200ms ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
