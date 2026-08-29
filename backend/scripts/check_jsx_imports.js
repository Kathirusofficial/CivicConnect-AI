const fs = require('fs');
const path = require('path');

function checkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      checkDir(fullPath);
    } else if (entry.name.endsWith('.jsx')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const matches = content.matchAll(/<([A-Z][a-zA-Z0-9]+)/g);
      const tags = new Set();
      for (const m of matches) tags.add(m[1]);
      
      const missing = [];
      for (const tag of tags) {
        const importPattern = new RegExp(`\\b${tag}\\b`);
        if (!importPattern.test(content)) {
          missing.push(tag);
        } else {
          // Verify if it's imported or defined
          const defPattern = new RegExp(`(import[\\s\\S]*?\\b${tag}\\b|const\\s+${tag}\\b|function\\s+${tag}\\b|class\\s+${tag}\\b|let\\s+${tag}\\b|var\\s+${tag}\\b)`);
          if (!defPattern.test(content)) {
            missing.push(tag);
          }
        }
      }
      if (missing.length > 0) {
        console.log(`[MISSING] ${path.relative(process.cwd(), fullPath)}:`, missing);
      } else {
        console.log(`[OK] ${path.relative(process.cwd(), fullPath)}`);
      }
    }
  }
}

checkDir(path.resolve(__dirname, '../../frontend/src'));
