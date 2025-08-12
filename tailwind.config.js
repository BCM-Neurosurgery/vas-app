/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./<custom-folder>/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Medical app specific colors
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#007AFF',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        success: {
          50: '#f0fdf4',
          500: '#34C759',
          600: '#16a34a',
        },
        warning: {
          50: '#fffbeb',
          500: '#FF9500',
          600: '#d97706',
        },
        error: {
          50: '#fef2f2',
          500: '#FF3B30',
          600: '#dc2626',
        },
        medical: {
          gray: '#f5f5f5',
          'gray-light': '#f8f9fa',
          'gray-medium': '#e0e0e0',
          'gray-dark': '#666',
          'text-primary': '#333',
          'text-secondary': '#666',
          'text-muted': '#999',
        }
      },
      fontFamily: {
        'space-mono': ['SpaceMono', 'monospace'],
      },
    },
  },
  plugins: [],
}

