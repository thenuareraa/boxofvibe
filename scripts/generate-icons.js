/**
 * Generates Android icon PNGs from the exact BoxOfVibe logo SVG.
 * Usage: node scripts/generate-icons.js
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

/**
 * Vinyl drawn to fill the safe zone (r≤36 from center 54,54).
 * Uses same visual style as the in-app logo: dark vinyl body with a
 * purple→pink→orange gradient border ring, groove rings, and gradient label.
 */
const ICON_SVG = `
<svg viewBox="0 0 108 108" xmlns="http://www.w3.org/2000/svg">
  <rect width="108" height="108" fill="#000000"/>
  <defs>
    <radialGradient id="glowGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%"   stop-color="#A855F7" stop-opacity="0.3"/>
      <stop offset="50%"  stop-color="#EC4899" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="#FB923C" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="vinylGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%"   stop-color="#4a4a4a"/>
      <stop offset="70%"  stop-color="#2a2a2a"/>
      <stop offset="100%" stop-color="#1a1a1a"/>
    </radialGradient>
    <linearGradient id="borderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"   stop-color="#A855F7"/>
      <stop offset="50%"  stop-color="#EC4899"/>
      <stop offset="100%" stop-color="#FB923C"/>
    </linearGradient>
    <linearGradient id="labelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"   stop-color="#A855F7"/>
      <stop offset="50%"  stop-color="#EC4899"/>
      <stop offset="100%" stop-color="#FB923C"/>
    </linearGradient>
    <linearGradient id="shineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%"   stop-color="#ffffff" stop-opacity="0"/>
      <stop offset="50%"  stop-color="#ffffff" stop-opacity="0.7"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <!-- Soft purple-pink glow behind vinyl (fills safe zone) -->
  <circle cx="54" cy="54" r="36" fill="url(#glowGrad)" opacity="0.8"/>
  <!-- Gradient border ring (purple→pink→orange, 2dp wide) -->
  <circle cx="54" cy="54" r="35" fill="url(#borderGrad)"/>
  <!-- Vinyl disc body covers all but 2dp border ring -->
  <circle cx="54" cy="54" r="33" fill="url(#vinylGrad)"/>
  <!-- Groove rings -->
  <circle cx="54" cy="54" r="29" fill="none" stroke="#3a3a3a" stroke-width="0.5" opacity="0.5"/>
  <circle cx="54" cy="54" r="25" fill="none" stroke="#3a3a3a" stroke-width="0.5" opacity="0.5"/>
  <circle cx="54" cy="54" r="21" fill="none" stroke="#3a3a3a" stroke-width="0.5" opacity="0.5"/>
  <circle cx="54" cy="54" r="17" fill="none" stroke="#3a3a3a" stroke-width="0.5" opacity="0.5"/>
  <!-- Center label with gradient -->
  <circle cx="54" cy="54" r="13" fill="url(#labelGrad)"/>
  <!-- Shine bar -->
  <rect x="50" y="21" width="8" height="66" rx="4" fill="url(#shineGrad)" opacity="0.15"/>
  <!-- Center hole -->
  <circle cx="54" cy="54" r="3" fill="#1a1a1a"/>
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
