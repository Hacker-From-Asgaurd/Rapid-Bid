const fs = require('fs');
const path = require('path');

// Precise replacements to turn hardcoded/legacy classes into semantic theme tokens
const replacements = [
  // Compound combinations
  { from: /bg-white dark:bg-slate-900/g, to: 'bg-surface' },
  { from: /bg-white dark:bg-slate-800/g, to: 'bg-surface' },
  { from: /bg-slate-50 dark:bg-slate-800\/40/g, to: 'bg-elevated' },
  { from: /bg-slate-50 dark:bg-slate-800/g, to: 'bg-elevated' },
  { from: /bg-slate-50 dark:bg-slate-900/g, to: 'bg-elevated' },
  { from: /bg-slate-100 dark:bg-slate-800/g, to: 'bg-elevated' },
  { from: /bg-\[#F4EFE6\] dark:bg-slate-800/g, to: 'bg-elevated' },
  { from: /bg-\[#FAF7F2\] dark:bg-slate-800\/40/g, to: 'bg-elevated' },
  { from: /bg-\[#FAF7F2\] dark:bg-slate-800/g, to: 'bg-elevated' },
  { from: /bg-\[#FAF8F5\] dark:bg-slate-800/g, to: 'bg-elevated' },
  { from: /border-\[#EAE5DB\] dark:border-slate-800/g, to: 'border-subtle' },
  { from: /border-\[#E8E3D8\] dark:border-slate-800/g, to: 'border-subtle' },
  { from: /border-slate-200 dark:border-slate-800/g, to: 'border-subtle' },
  { from: /border-slate-200 dark:border-slate-700/g, to: 'border-subtle' },
  { from: /border-slate-300 dark:border-slate-700/g, to: 'border-subtle' },
  { from: /border-slate-100 dark:border-slate-800/g, to: 'border-subtle' },
  { from: /text-\[#242826\] dark:text-white/g, to: 'text-primary' },
  { from: /text-slate-900 dark:text-white/g, to: 'text-primary' },
  { from: /text-slate-600 dark:text-slate-300/g, to: 'text-secondary' },
  { from: /text-slate-500 dark:text-slate-400/g, to: 'text-muted' },
  { from: /text-\[#5C6460\] dark:text-slate-400/g, to: 'text-secondary' },

  // Remaining dark: classes in combinations
  { from: /dark:bg-slate-950/g, to: 'bg-surface' },
  { from: /dark:bg-slate-900/g, to: 'bg-surface' },
  { from: /dark:bg-slate-800/g, to: 'bg-elevated' },
  { from: /dark:bg-zinc-900/g, to: 'bg-surface' },
  { from: /dark:bg-zinc-800/g, to: 'bg-elevated' },
  { from: /dark:border-slate-800/g, to: 'border-subtle' },
  { from: /dark:border-slate-700/g, to: 'border-subtle' },
  { from: /dark:border-zinc-800/g, to: 'border-subtle' },
  { from: /dark:text-white/g, to: 'text-primary' },
  { from: /dark:text-slate-100/g, to: 'text-primary' },
  { from: /dark:text-slate-200/g, to: 'text-primary' },
  { from: /dark:text-slate-300/g, to: 'text-secondary' },
  { from: /dark:text-slate-400/g, to: 'text-muted' },
  { from: /dark:text-zinc-300/g, to: 'text-secondary' },
  { from: /dark:text-zinc-400/g, to: 'text-muted' },

  // Hardcoded light colors in RatesPage
  { from: /text-\[#242826\]/g, to: 'text-primary' },
  { from: /text-\[#5C6460\]/g, to: 'text-secondary' },
  { from: /border-\[#EAE5DB\]/g, to: 'border-subtle' },
  { from: /border-\[#E8E3D8\]/g, to: 'border-subtle' },
  { from: /bg-\[#F4EFE6\]/g, to: 'bg-elevated' },
  { from: /bg-\[#FAF7F2\]/g, to: 'bg-elevated' },
];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  
  for (const r of replacements) {
    content = content.replace(r.from, r.to);
  }

  // Deduplicate redundant classes like "bg-surface bg-surface" or "border-subtle border-subtle"
  content = content.replace(/\bbg-surface\s+bg-surface\b/g, 'bg-surface');
  content = content.replace(/\bbg-elevated\s+bg-elevated\b/g, 'bg-elevated');
  content = content.replace(/\bborder-subtle\s+border-subtle\b/g, 'border-subtle');
  content = content.replace(/\btext-primary\s+text-primary\b/g, 'text-primary');
  content = content.replace(/\btext-secondary\s+text-secondary\b/g, 'text-secondary');
  content = content.replace(/\btext-muted\s+text-muted\b/g, 'text-muted');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  } else {
    console.log(`No changes needed in ${filePath}`);
  }
}

const targetFile = process.argv[2];
if (targetFile) {
  processFile(path.resolve(targetFile));
} else {
  console.log('Usage: node scripts/batch-replace-tokens.js <path>');
}
