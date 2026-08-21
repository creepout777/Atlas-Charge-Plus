const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="512" height="512">
  <rect width="200" height="200" rx="44" fill="#ffffff" />
  <path fill="#00b069" opacity="0.2" d="M 100,20 Q 150,80 180,140 Q 100,180 20,140 Q 50,80 100,20 Z" />
  <path fill="none" stroke="#00b069" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" d="M 100,20 Q 150,80 180,140 Q 100,180 20,140 Q 50,80 100,20 Z M 100,20 L 100,161" />
</svg>`;

const svgBuffer = Buffer.from(svgContent);

async function generate() {
  const baseDir = __dirname;
  const publicDir = path.join(baseDir, 'public');
  const resDir = path.join(baseDir, 'android', 'app', 'src', 'main', 'res');

  // 1. Web Logo PNG (512x512)
  await sharp(svgBuffer).resize(512, 512).png().toFile(path.join(publicDir, 'logo.png'));
  console.log('Generated public/logo.png');

  // 2. Android Mipmap Icons
  const sizes = [
    { dir: 'mipmap-mdpi', size: 48 },
    { dir: 'mipmap-hdpi', size: 72 },
    { dir: 'mipmap-xhdpi', size: 96 },
    { dir: 'mipmap-xxhdpi', size: 144 },
    { dir: 'mipmap-xxxhdpi', size: 192 },
  ];

  for (const { dir, size } of sizes) {
    const targetFolder = path.join(resDir, dir);
    if (!fs.existsSync(targetFolder)) {
      fs.mkdirSync(targetFolder, { recursive: true });
    }
    // ic_launcher.png
    await sharp(svgBuffer).resize(size, size).png().toFile(path.join(targetFolder, 'ic_launcher.png'));
    // ic_launcher_round.png
    await sharp(svgBuffer).resize(size, size).png().toFile(path.join(targetFolder, 'ic_launcher_round.png'));
    // ic_launcher_foreground.png
    await sharp(svgBuffer).resize(size, size).png().toFile(path.join(targetFolder, 'ic_launcher_foreground.png'));
    console.log(`Generated ${dir} icons (${size}x${size})`);
  }

  console.log('All icons generated successfully!');
}

generate().catch(console.error);
