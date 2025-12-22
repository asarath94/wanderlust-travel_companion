const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'node_modules', 'nativewind', 'dist', 'metro', 'transformer.js');
try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    let output = '';

    output += '--- IMPORTS (1-20) ---\n';
    for (let i = 0; i < 20; i++) {
        if (lines[i] !== undefined) output += `${i+1}: ${lines[i]}\n`;
    }

    output += '--- LOGIC (30-80) ---\n';
    for (let i = 30; i < 80; i++) {
        if (lines[i] !== undefined) output += `${i+1}: ${lines[i]}\n`;
    }
    
    fs.writeFileSync('transformer_dump.txt', output);
    console.log('Dumped to transformer_dump.txt');

} catch (e) {
    console.error(e);
}
