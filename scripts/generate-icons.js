/**
 * Simple script to generate placeholder PWA icons as SVG-based PNGs.
 * In production, replace these with actual designed icons.
 * 
 * For now, creates simple colored squares with "RS" text.
 * Run: node scripts/generate-icons.js
 */

const fs = require('fs');
const path = require('path');

function generateSvgIcon(size, maskable = false) {
  const padding = maskable ? size * 0.1 : 0;
  const innerSize = size - padding * 2;
  const fontSize = Math.round(size * 0.35);
  const radius = maskable ? 0 : Math.round(size * 0.15);
  
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#0c0c14"/>
  <rect x="${padding}" y="${padding}" width="${innerSize}" height="${innerSize}" rx="${radius}" fill="#7c5cfc" opacity="0.9"/>
  <text x="${size/2}" y="${size/2 + fontSize * 0.35}" font-family="system-ui, sans-serif" font-size="${fontSize}" font-weight="bold" fill="#ffffff" text-anchor="middle">RS</text>
</svg>`;
}

const iconsDir = path.join(__dirname, '..', 'public', 'icons');
fs.mkdirSync(iconsDir, { recursive: true });

// Write SVG icons (browsers will render them fine, proper PNGs would need canvas/sharp)
const sizes = [
  { size: 192, name: 'icon-192.png', maskable: false },
  { size: 512, name: 'icon-512.png', maskable: false },
  { size: 512, name: 'icon-512-maskable.png', maskable: true },
];

// Since we can't easily create PNGs without a dependency, we'll create SVG files
// and also create a simple favicon.svg
for (const { size, name, maskable } of sizes) {
  const svgName = name.replace('.png', '.svg');
  const svg = generateSvgIcon(size, maskable);
  fs.writeFileSync(path.join(iconsDir, svgName), svg);
  console.log(`Created ${svgName}`);
}

// Create favicon SVG
const faviconSvg = generateSvgIcon(32, false);
fs.writeFileSync(path.join(__dirname, '..', 'src', 'app', 'favicon.svg'), faviconSvg);

// Create a simple apple-touch-icon SVG
const appleIcon = generateSvgIcon(180, false);
fs.writeFileSync(path.join(iconsDir, 'apple-touch-icon.svg'), appleIcon);

console.log('Placeholder icons generated. Replace with real assets for production.');
