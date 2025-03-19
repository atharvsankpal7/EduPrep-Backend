const fs = require('fs');
const path = require('path');

function removeConsoleLogs(dir) {
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            removeConsoleLogs(fullPath);
        } else if (file.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let updatedContent = content.replace(/^\s*console\.log\(.*\);?\s*$/gm, '');
            fs.writeFileSync(fullPath, updatedContent, 'utf8');
        }
    });
}

removeConsoleLogs(process.cwd());
console.log('✅ Removed all console.log statements.');
