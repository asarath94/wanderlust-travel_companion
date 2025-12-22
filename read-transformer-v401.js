const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, 'node_modules', 'nativewind', 'dist', 'metro', 'transformer.js');

try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    console.log('--- Transformer Content (Lines 30-60) ---');
    for (let i = 30; i < 60; i++) {
        if (lines[i] !== undefined) console.log(`${i+1}: ${lines[i]}`);
    }
} catch (e) {
    console.error(e);
}
