/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkBg: '#0F172A',
        darkCard: '#1E293B',
        darkBorder: '#334155',
        darkHover: '#2A374A',
        primary: {
          DEFAULT: '#3B82F6',
          hover: '#2563EB',
          light: '#60A5FA',
        },
        status: {
          assigned: '#3B82F6',
          progress: '#F59E0B',
          completed: '#10B981',
        }
      },
    },
  },
  plugins: [],
}
