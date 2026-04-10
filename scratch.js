const fs = require('fs');
const path = require('path');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  const replacements = {
    'bg-white': 'bg-white dark:bg-slate-900',
    'bg-slate-50': 'bg-slate-50 dark:bg-[#0a0a0a]',
    'text-slate-900': 'text-slate-900 dark:text-slate-100',
    'text-slate-700': 'text-slate-700 dark:text-slate-300',
    'text-slate-600': 'text-slate-600 dark:text-slate-300',
    'text-slate-500': 'text-slate-500 dark:text-slate-400',
    'text-slate-400': 'text-slate-400 dark:text-slate-500',
    'text-slate-300': 'text-slate-300 dark:text-slate-600',
    'border-slate-200': 'border-slate-200 dark:border-slate-800',
    'border-slate-100': 'border-slate-100 dark:border-slate-800/50',
    'hover:bg-slate-50': 'hover:bg-slate-50 dark:hover:bg-slate-800',
    'hover:text-slate-900': 'hover:text-slate-900 dark:hover:text-white',
    'bg-blue-50': 'bg-blue-50 dark:bg-blue-900/30',
    'bg-blue-100': 'bg-blue-100 dark:bg-blue-900/50',
    'text-blue-700': 'text-blue-700 dark:text-blue-400',
    'text-blue-600': 'text-blue-600 dark:text-blue-400',
    'hover:bg-blue-50': 'hover:bg-blue-50 dark:hover:bg-blue-900/50',
    'bg-amber-50': 'bg-amber-50 dark:bg-amber-900/30',
    'text-amber-600': 'text-amber-600 dark:text-amber-400',
    'bg-green-50': 'bg-green-50 dark:bg-green-900/30',
    'text-green-600': 'text-green-600 dark:text-green-400',
    'bg-red-50': 'bg-red-50 dark:bg-red-900/30',
    'text-red-600': 'text-red-600 dark:text-red-400'
  };

  for (const [key, value] of Object.entries(replacements)) {
    // Regex matches the class exactly, making sure it isn't followed by dark: already, preventing infinite appends if script is run multiple times
    const regex = new RegExp(`(?<!dark:)\\b${key}\\b(?!\\s*dark:)`, 'g');
    content = content.replace(regex, value);
  }

  // Handle case where class might be duplicated by consecutive runs if the regex isn't perfect
  content = content.replace(/bg-white dark:bg-slate-900 dark:bg-slate-900/g, 'bg-white dark:bg-slate-900');

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    console.log('Updated ' + filePath);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      processFile(fullPath);
    }
  }
}

walkDir('./src');
