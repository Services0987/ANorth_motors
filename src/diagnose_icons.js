import * as Lucide from 'lucide-react';

const iconsToCheck = [
  'Plus', 'Pencil', 'Trash2', 'X', 'Check', 'Star', 'StarOff', 'Search', 
  'ChevronDown', 'Upload', 'Download', 'FileText', 'CircleAlert', 
  'RefreshCw', 'Globe', 'Link', 'Settings', 'Layers', 
  'ChevronLeft', 'ChevronRight', 'LayoutGrid', 'LayoutList', 'CircleCheck'
];

console.log("--- Lucide Icon Verification ---");
iconsToCheck.forEach(name => {
  if (Lucide[name]) {
    console.log(`[OK] ${name}`);
  } else {
    console.log(`[MISSING] ${name}`);
    // Check for case variations
    const lower = name.toLowerCase();
    const found = Object.keys(Lucide).find(k => k.toLowerCase() === lower);
    if (found) console.log(`      -> Suggestion: Use '${found}' instead of '${name}'`);
  }
});
