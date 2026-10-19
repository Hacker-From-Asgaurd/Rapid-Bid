// WCAG 2.1 Contrast Ratio Verification Script
// Tests all foreground/background token pairs in BOTH light and dark themes

function sRGBtoLin(c) {
  c = c / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function hexToRgb(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(x => x + x).join('');
  const num = parseInt(hex, 16);
  return [num >> 16, (num >> 8) & 255, num & 255];
}

function luminance(hex) {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * sRGBtoLin(r) + 0.7152 * sRGBtoLin(g) + 0.0722 * sRGBtoLin(b);
}

function contrast(hex1, hex2) {
  const l1 = luminance(hex1);
  const l2 = luminance(hex2);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

// Token sets matching :root and .dark CSS variables
const palettes = {
  Light: {
    bgBase: '#F9F7F2',
    bgSurface: '#FFFFFF',
    bgElevated: '#FAF7F2',
    textPrimary: '#242826',
    textSecondary: '#5C6460',
    textMuted: '#66706B',
    accent: '#2F4D40',
    accentContrast: '#FFFFFF',
    accentText: '#2F4D40',
    focusRing: '#2F4D40',
    borderSubtle: '#BDB4A5',
    borderStrong: '#766D60',
    // Status chips
    success: '#1B5E20',
    successBg: '#EAF5EF',
    warning: '#7A4D05',
    warningBg: '#FEF7EB',
    error: '#B71C1C',
    errorBg: '#FDF1EB',
    info: '#1A4971',
    infoBg: '#EFF5FA',
    // Tints
    tintLavender: '#F6F1F8',
    tintMint: '#EEF5F1',
    tintPeach: '#FDF1EB',
    tintSky: '#EFF5FA',
  },
  Dark: {
    bgBase: '#14121F',
    bgSurface: '#1D1A2E',
    bgElevated: '#26223B',
    textPrimary: '#EDEBFA',
    textSecondary: '#B9B5D6',
    textMuted: '#9692BA',
    accent: '#6D4AE8',
    accentContrast: '#FFFFFF',
    accentText: '#B8A6FF',
    focusRing: '#B8A6FF',
    borderSubtle: '#3A3558',
    borderStrong: '#69619B',
    // Status chips (14% tinted bg on surface)
    success: '#7FE0A8',
    successBg: '#28343C',
    warning: '#F6C453',
    warningBg: '#3B3332',
    error: '#FF8A8A',
    errorBg: '#3D2A3B',
    info: '#9CC9F2',
    infoBg: '#2F3349',
    // Tints (12% translucent on surface)
    tintLavender: '#2E2846',
    tintMint: '#2B3140',
    tintPeach: '#382D3B',
    tintSky: '#2C2F46',
  }
};

let allPassed = true;
let totalChecks = 0;
let passedChecks = 0;

console.log('================================================================================');
console.log('            WCAG CONTRAST VERIFICATION: LIGHT & DARK TOKENS');
console.log('================================================================================\n');

for (const [themeName, tokens] of Object.entries(palettes)) {
  console.log(`\n------------------ ${themeName.toUpperCase()} THEME TOKEN AUDIT ------------------`);
  console.log(
    'Foreground'.padEnd(20) + 
    'Background'.padEnd(16) + 
    'Ratio'.padEnd(10) + 
    'Req'.padEnd(8) + 
    'Status'
  );
  console.log('-'.repeat(60));

  const testCases = [
    // Text on surfaces (normal text requires >= 4.5:1)
    { fg: 'textPrimary', bg: 'bgBase', req: 4.5 },
    { fg: 'textPrimary', bg: 'bgSurface', req: 4.5 },
    { fg: 'textPrimary', bg: 'bgElevated', req: 4.5 },
    { fg: 'textSecondary', bg: 'bgBase', req: 4.5 },
    { fg: 'textSecondary', bg: 'bgSurface', req: 4.5 },
    { fg: 'textSecondary', bg: 'bgElevated', req: 4.5 },
    { fg: 'textMuted', bg: 'bgBase', req: 4.5 },
    { fg: 'textMuted', bg: 'bgSurface', req: 4.5 },
    { fg: 'textMuted', bg: 'bgElevated', req: 4.5 },

    // Accent button text (>= 4.5:1)
    { fg: 'accentContrast', bg: 'accent', req: 4.5 },
    { fg: 'accentText', bg: 'bgBase', req: 4.5 },
    { fg: 'accentText', bg: 'bgSurface', req: 4.5 },

    // Text on tinted cards (>= 4.5:1)
    { fg: 'textPrimary', bg: 'tintLavender', req: 4.5 },
    { fg: 'textPrimary', bg: 'tintMint', req: 4.5 },
    { fg: 'textPrimary', bg: 'tintPeach', req: 4.5 },
    { fg: 'textPrimary', bg: 'tintSky', req: 4.5 },

    // Status badges & chips (text on its tint bg >= 4.5:1)
    { fg: 'success', bg: 'successBg', req: 4.5 },
    { fg: 'warning', bg: 'warningBg', req: 4.5 },
    { fg: 'error', bg: 'errorBg', req: 4.5 },
    { fg: 'info', bg: 'infoBg', req: 4.5 },

    // Status text on surfaces (>= 4.5:1)
    { fg: 'success', bg: 'bgSurface', req: 4.5 },
    { fg: 'warning', bg: 'bgSurface', req: 4.5 },
    { fg: 'error', bg: 'bgSurface', req: 4.5 },
    { fg: 'info', bg: 'bgSurface', req: 4.5 },

    // Focus ring & UI Component Borders (>= 3.0:1)
    { fg: 'focusRing', bg: 'bgBase', req: 3.0 },
    { fg: 'borderStrong', bg: 'bgBase', req: 3.0 },
  ];

  for (const { fg, bg, req } of testCases) {
    totalChecks++;
    const fgColor = tokens[fg];
    const bgColor = tokens[bg];
    const cr = contrast(fgColor, bgColor);
    const pass = cr >= req;
    if (pass) {
      passedChecks++;
    } else {
      allPassed = false;
    }

    const ratioStr = cr.toFixed(2) + ':1';
    const reqStr = '>=' + req + ':1';
    const statusStr = pass ? '✓ PASS' : '✗ FAIL';

    console.log(
      fg.padEnd(20) + 
      bg.padEnd(16) + 
      ratioStr.padEnd(10) + 
      reqStr.padEnd(8) + 
      statusStr
    );
  }
}

console.log('\n================================================================================');
console.log(`TOTAL CHECKS: ${totalChecks} | PASSED: ${passedChecks} | FAILED: ${totalChecks - passedChecks}`);
if (allPassed) {
  console.log('RESULT: ALL TOKEN CONTRAST RATIOS MEET OR EXCEED WCAG SPECIFICATIONS!');
  console.log('================================================================================');
  process.exit(0);
} else {
  console.error('RESULT: CONTRAST AUDIT FAILED.');
  console.log('================================================================================');
  process.exit(1);
}
