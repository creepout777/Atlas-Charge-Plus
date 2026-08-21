import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function generate() {
  const logoPath = path.resolve('public/logo.png');
  const baseDir = path.resolve('android/app/src/main/res');

  if (!fs.existsSync(logoPath)) {
    throw new Error('public/logo.png not found!');
  }

  console.log('Using web app logo from public/logo.png for Android launcher icons...');

  // Read metadata of original web logo
  const logoBuffer = fs.readFileSync(logoPath);

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

    // 1. ic_launcher.png (Square with white background & rounded corners)
    const iconInnerSize = Math.round(item.size * 0.8);
    const iconPadding = Math.round((item.size - iconInnerSize) / 2);
    
    const resizedInnerLogo = await sharp(logoBuffer)
      .resize(iconInnerSize, iconInnerSize, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .toBuffer();

    const roundedMask = Buffer.from(`
      <svg width="${item.size}" height="${item.size}">
        <rect x="0" y="0" width="${item.size}" height="${item.size}" rx="${Math.round(item.size * 0.22)}" fill="#ffffff"/>
      </svg>
    `);

    await sharp(roundedMask)
      .composite([{ input: resizedInnerLogo, top: iconPadding, left: iconPadding }])
      .png()
      .toFile(path.join(targetDir, 'ic_launcher.png'));

    // 2. ic_launcher_round.png (Circular white icon)
    const circleMask = Buffer.from(`
      <svg width="${item.size}" height="${item.size}">
        <circle cx="${item.size / 2}" cy="${item.size / 2}" r="${item.size / 2}" fill="#ffffff"/>
      </svg>
    `);

    await sharp(circleMask)
      .composite([{ input: resizedInnerLogo, top: iconPadding, left: iconPadding }])
      .png()
      .toFile(path.join(targetDir, 'ic_launcher_round.png'));

    // 3. ic_launcher_foreground.png (Adaptive icon foreground with safe margins)
    const fgInnerSize = Math.round(item.fgSize * 0.62);
    const fgPadding = Math.round((item.fgSize - fgInnerSize) / 2);

    const resizedFgLogo = await sharp(logoBuffer)
      .resize(fgInnerSize, fgInnerSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();

    await sharp({
      create: {
        width: item.fgSize,
        height: item.fgSize,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
      .composite([{ input: resizedFgLogo, top: fgPadding, left: fgPadding }])
      .png()
      .toFile(path.join(targetDir, 'ic_launcher_foreground.png'));

    console.log(`Generated Android icons for ${item.dir} matching web app logo`);
  }

  // 4. Pure white splash screen drawable to eliminate centered logo flash
  const whiteSplash = await sharp({
    create: {
      width: 1080,
      height: 1920,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  }).png().toBuffer();

  const drawableDirs = [
    'drawable',
    'drawable-port-hdpi',
    'drawable-port-mdpi',
    'drawable-port-xhdpi',
    'drawable-port-xxhdpi',
    'drawable-port-xxxhdpi',
    'drawable-land-hdpi',
    'drawable-land-mdpi',
    'drawable-land-xhdpi',
    'drawable-land-xxhdpi',
    'drawable-land-xxxhdpi',
  ];

  for (const dDir of drawableDirs) {
    const fullPath = path.join(baseDir, dDir);
    if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });
    fs.writeFileSync(path.join(fullPath, 'splash.png'), whiteSplash);
  }

  console.log('Clean white splash screen drawables generated to eliminate centered logo flash.');
}

generate().catch(console.error);
