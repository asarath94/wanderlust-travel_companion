/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  safelist: [
    // Include all shadow utilities
    { pattern: /shadow-.+/ },
    "shadow",
    "shadow-sm",
    "shadow-md",
    "shadow-lg",
    "shadow-xl",
    "shadow-2xl",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {},
  },
  plugins: [],
}