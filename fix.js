const fs = require('fs');
const path = require('path');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  content = content.replace(/hover:bg-slate-50 dark:bg-\[\#0a0a0a\]/g, 'hover:bg-slate-50 dark:hover:bg-slate-800');
  content = content.replace(/hover:text-slate-900 dark:text-slate-100/g, 'hover:text-slate-900 dark:hover:text-white');
  content = content.replace(/hover:bg-blue-50 dark:bg-blue-900\/30/g, 'hover:bg-blue-50 dark:hover:bg-blue-900/50');
  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log('Fixed ', filePath);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      fixFile(fullPath);
    }
  }
}

walkDir('./src/app/dashboard');
