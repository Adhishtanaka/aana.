/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        google: {
          'dark-bg': '#202124',       
          'dark-surface': '#303134',   
          'dark-surface-variant': '#3c4043', 
          'dark-surface-2': '#28292c',  

       
          'light-bg': '#ffffff',      
          'light-surface': '#f8f9fa',  
          'light-surface-variant': '#f1f3f4', 
          'dark-text-primary': '#e8eaed',    
          'dark-text-secondary': '#9aa0a6',  
          'dark-text-disabled': '#5f6368',  
          'light-text-primary': '#202124',   
          'light-text-secondary': '#5f6368',
          'light-text-disabled': '#9aa0a6',
          'blue': '#8ab4f8', 
          'blue-light': '#1a73e8', 
          'blue-hover': '#aecbfa', 
          'dark-border': '#5f6368', 
          'light-border': '#dadce0', 
          'dark-hover': '#3c4043',
          'light-hover': '#f1f3f4', 
          'red': '#f28b82', 
          'red-light': '#ea4335',
          'green': '#81c995', 
          'green-light': '#34a853', 
          'yellow': '#fdd663', 
          'yellow-light': '#fbbc04',
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'fade-in-up': 'fadeInUp 0.5s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      scale: {
        '101': '1.01',
        '102': '1.02',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}

