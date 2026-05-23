import sharp from 'sharp';
import { readFileSync } from 'fs';
import { join } from 'path';

const svg = readFileSync('icon_source.svg');
const RES = 'android/app/src/main/res';

const DENSITIES = [
  { folder: 'mipmap-mdpi',    launcher: 48,  fg: 108 },
  { folder: 'mipmap-hdpi',    launcher: 72,  fg: 162 },
  { folder: 'mipmap-xhdpi',   launcher: 96,  fg: 216 },
  { folder: 'mipmap-xxhdpi',  launcher: 144, fg: 324 },
  { folder: 'mipmap-xxxhdpi', launcher: 192, fg: 432 },
];

for (const { folder, launcher, fg } of DENSITIES) {
  const base = join(RES, folder);

  await sharp(svg).resize(launcher, launcher).png().toFile(join(base, 'ic_launcher.png'));
  await sharp(svg).resize(launcher, launcher).png().toFile(join(base, 'ic_launcher_round.png'));
  await sharp(svg).resize(fg, fg).png().toFile(join(base, 'ic_launcher_foreground.png'));

  console.log(`${folder}: launcher=${launcher}px  foreground=${fg}px`);
}

console.log('\nDone.');
