const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'node_modules', 'nativewind', 'dist', 'metro', 'tailwind-cli.js');
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
lines.forEach((line, index) => {
  if (line.includes('const tailwindCli =')) {
    console.log(`Line ${index+1}: ${line.trim()}`);
  }
});
