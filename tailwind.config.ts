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
        'surface-subtle': 'var(--surface-subtle)',
        'surface-active': 'var(--surface-active)',
        'surface-hover': 'var(--surface-hover)',
        border: 'var(--border)',
        'border-subtle': 'var(--border-subtle)',
        'border-hover': 'var(--border-hover)',
        
        // Text
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-tertiary': 'var(--text-tertiary)',
        'text-inverse': 'var(--text-inverse)',
        
        // Card type colors
        'card-task': 'var(--card-task)',
        'card-task-bg': 'var(--card-task-bg)',
        'card-task-border': 'var(--card-task-border)',
        'card-story': 'var(--card-story)',
        'card-story-bg': 'var(--card-story-bg)',
        'card-story-border': 'var(--card-story-border)',
        'card-epic': 'var(--card-epic)',
        'card-epic-bg': 'var(--card-epic-bg)',
        'card-epic-border': 'var(--card-epic-border)',
        'card-utility': 'var(--card-utility)',
        'card-utility-bg': 'var(--card-utility-bg)',
        'card-utility-border': 'var(--card-utility-border)',
        
        // Semantic
        success: 'var(--success)',
        warning: 'var(--warning)',
        error: 'var(--error)',
        info: 'var(--info)',
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
