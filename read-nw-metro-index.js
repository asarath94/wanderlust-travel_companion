const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'node_modules', 'nativewind', 'dist', 'metro', 'index.js');

try {
    const content = fs.readFileSync(filePath, 'utf8');
    console.log(content);
} catch (e) {
    console.error(e);
}
