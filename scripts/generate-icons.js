/**
 * Generates Android icon PNGs from the exact BoxOfVibe logo SVG.
 * Usage: node scripts/generate-icons.js
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

/**
 * The vinyl is drawn within the center 68% of the canvas (matching Android's
 * adaptive icon safe zone) so the gradient border ring is never clipped.
 * Black background fills the rest.
 */
const ICON_SVG = `
<svg viewBox="0 0 108 108" xmlns="http://www.w3.org/2000/svg">
  <rect width="108" height="108" fill="#000000"/>
  <defs>
    <radialGradient id="glowGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%"  stop-color="#000000" stop-opacity="0"/>
      <stop offset="74%" stop-color="#000000" stop-opacity="0"/>
      <stop offset="82%" stop-color="#A855F7" stop-opacity="0.6"/>
      <stop offset="91%" stop-color="#EC4899" stop-opacity="1"/>
      <stop offset="100%" stop-color="#FB923C" stop-opacity="1"/>
    </radialGradient>
    <radialGradient id="vinylGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%"  stop-color="#4a4a4a"/>
      <stop offset="70%" stop-color="#2a2a2a"/>
      <stop offset="100%" stop-color="#1a1a1a"/>
    </radialGradient>
    <linearGradient id="labelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"   stop-color="#A855F7"/>
      <stop offset="50%"  stop-color="#EC4899"/>
      <stop offset="100%" stop-color="#FB923C"/>
    </linearGradient>
    <linearGradient id="shineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%"   stop-color="#ffffff" stop-opacity="0"/>
      <stop offset="50%"  stop-color="#ffffff" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <!-- All elements within r=34 of center (54,54) — safe zone -->
  <circle cx="54" cy="54" r="34" fill="url(#glowGrad)"/>
  <circle cx="54" cy="54" r="31" fill="url(#vinylGrad)"/>
  <circle cx="54" cy="54" r="27" fill="none" stroke="#3a3a3a" stroke-width="0.8" opacity="0.5"/>
  <circle cx="54" cy="54" r="23" fill="none" stroke="#3a3a3a" stroke-width="0.8" opacity="0.5"/>
  <circle cx="54" cy="54" r="19" fill="none" stroke="#3a3a3a" stroke-width="0.8" opacity="0.5"/>
  <circle cx="54" cy="54" r="15" fill="none" stroke="#3a3a3a" stroke-width="0.8" opacity="0.5"/>
  <circle cx="54" cy="54" r="11" fill="url(#labelGrad)"/>
  <rect x="51" y="20" width="6" height="68" rx="3" fill="url(#shineGrad)" opacity="0.12"/>
  <circle cx="54" cy="54" r="3"  fill="#1a1a1a"/>
</svg>
`;

const BASE = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');

const ICON_SIZES = {
  'mipmap-mdpi':    48,
  'mipmap-hdpi':    72,
  'mipmap-xhdpi':   96,
  'mipmap-xxhdpi':  144,
  'mipmap-xxxhdpi': 192,
};

async function run() {
  console.log('Generating Android icon PNGs from your BoxOfVibe logo...');

  for (const [folder, size] of Object.entries(ICON_SIZES)) {
    const outDir = path.join(BASE, folder);
    fs.mkdirSync(outDir, { recursive: true });

    const buf = Buffer.from(ICON_SVG);
    await sharp(buf).resize(size, size).png().toFile(path.join(outDir, 'ic_launcher.png'));
    await sharp(buf).resize(size, size).png().toFile(path.join(outDir, 'ic_launcher_round.png'));
    await sharp(buf).resize(size, size).png().toFile(path.join(outDir, 'ic_launcher_foreground.png'));

    console.log(`  ${folder}: ${size}x${size} ✓`);
  }

  console.log('\nDone! Run: npx cap sync android');
}

run().catch(console.error);
