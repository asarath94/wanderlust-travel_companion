const path = require('path');

module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: [
    path.join(__dirname, "app/**/*.{js,jsx,ts,tsx}"),
    path.join(__dirname, "components/**/*.{js,jsx,ts,tsx}")
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {},
  },
  plugins: [],
}
