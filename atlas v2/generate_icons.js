import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const svgLogo = `
<svg width="512" height="512" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <rect width="200" height="200" rx="44" fill="#ffffff"/>
  <path d="M 100,20 Q 150,80 180,140 Q 100,180 20,140 Q 50,80 100,20 Z" fill="#00b069" opacity="0.12"/>
  <path d="M 100,20 Q 150,80 180,140 Q 100,180 20,140 Q 50,80 100,20 Z M 100,20 L 100,161" fill="none" stroke="#00b069" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`;

const svgForeground = `
<svg width="512" height="512" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(30, 30) scale(0.7)">
    <path d="M 100,20 Q 150,80 180,140 Q 100,180 20,140 Q 50,80 100,20 Z" fill="#00b069" opacity="0.15"/>
    <path d="M 100,20 Q 150,80 180,140 Q 100,180 20,140 Q 50,80 100,20 Z M 100,20 L 100,161" fill="none" stroke="#00b069" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>
`;

const svgRoundLogo = `
<svg width="512" height="512" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <circle cx="100" cy="100" r="96" fill="#ffffff" stroke="#00b069" stroke-width="4"/>
  <g transform="translate(20, 20) scale(0.8)">
    <path d="M 100,20 Q 150,80 180,140 Q 100,180 20,140 Q 50,80 100,20 Z" fill="#00b069" opacity="0.15"/>
    <path d="M 100,20 Q 150,80 180,140 Q 100,180 20,140 Q 50,80 100,20 Z M 100,20 L 100,161" fill="none" stroke="#00b069" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>
`;

async function generate() {
  const baseDir = path.resolve('android/app/src/main/res');

  // Web logo
  await sharp(Buffer.from(svgLogo)).resize(512, 512).toFile('public/logo.png');
  await sharp(Buffer.from(svgLogo)).resize(192, 192).toFile('public/icon.png');
  console.log('Web icons generated');

  const mipmaps = [
    { dir: 'mipmap-mdpi', size: 48, fgSize: 108 },
    { dir: 'mipmap-hdpi', size: 72, fgSize: 162 },
    { dir: 'mipmap-xhdpi', size: 96, fgSize: 216 },
    { dir: 'mipmap-xxhdpi', size: 144, fgSize: 324 },
    { dir: 'mipmap-xxxhdpi', size: 192, fgSize: 432 },
  ];

  for (const item of mipmaps) {
    const targetDir = path.join(baseDir, item.dir);
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

    // ic_launcher.png
    await sharp(Buffer.from(svgLogo))
      .resize(item.size, item.size)
      .toFile(path.join(targetDir, 'ic_launcher.png'));

    // ic_launcher_round.png
    await sharp(Buffer.from(svgRoundLogo))
      .resize(item.size, item.size)
      .toFile(path.join(targetDir, 'ic_launcher_round.png'));

    // ic_launcher_foreground.png
    await sharp(Buffer.from(svgForeground))
      .resize(item.fgSize, item.fgSize)
      .toFile(path.join(targetDir, 'ic_launcher_foreground.png'));

    console.log(`Generated icons for ${item.dir}`);
  }

  // Generate splash drawables (white background with logo centered)
  const splashSvg = `
  <svg width="1080" height="1920" viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg">
    <rect width="1080" height="1920" fill="#ffffff"/>
    <g transform="translate(440, 860) scale(1.0)">
      <circle cx="100" cy="100" r="90" fill="none" stroke="#00b069" stroke-width="2" opacity="0.3"/>
      <path d="M 100,20 Q 150,80 180,140 Q 100,180 20,140 Q 50,80 100,20 Z" fill="#00b069" opacity="0.15"/>
      <path d="M 100,20 Q 150,80 180,140 Q 100,180 20,140 Q 50,80 100,20 Z M 100,20 L 100,161" fill="none" stroke="#00b069" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
  </svg>
  `;

  const splashDrawableDir = path.join(baseDir, 'drawable');
  if (!fs.existsSync(splashDrawableDir)) fs.mkdirSync(splashDrawableDir, { recursive: true });
  await sharp(Buffer.from(splashSvg)).resize(1080, 1920).toFile(path.join(splashDrawableDir, 'splash.png'));
  console.log('Splash icon generated');
}

generate().catch(console.error);
