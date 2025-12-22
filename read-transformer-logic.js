const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'node_modules', 'nativewind', 'dist', 'metro', 'transformer.js');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

for (let i = 30; i < 60; i++) {
    if (lines[i] !== undefined) console.log(`${i+1}: ${lines[i]}`);
}
