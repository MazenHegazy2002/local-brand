const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function generateIcons() {
  const rootDir = path.join(__dirname, '..');
  const publicDir = path.join(rootDir, 'public');
  const appDir = path.join(rootDir, 'src', 'app');
  const sourcePath = path.join(rootDir, 'mobile', 'assets', 'icon.png');
  const adaptivePath = path.join(rootDir, 'mobile', 'assets', 'adaptive-icon.png');

  if (!fs.existsSync(sourcePath)) {
    console.error('Source icon not found at:', sourcePath);
    return;
  }

  // 1. Regular icons
  await sharp(sourcePath).resize(192, 192).png().toFile(path.join(publicDir, 'icon-192.png'));

  await sharp(sourcePath).resize(512, 512).png().toFile(path.join(publicDir, 'icon-512.png'));

  // 2. Apple Touch Icons (180x180)
  await sharp(sourcePath)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));

  await sharp(sourcePath)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon-180x180.png'));

  await sharp(sourcePath)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon-precomposed.png'));

  await sharp(sourcePath).resize(180, 180).png().toFile(path.join(appDir, 'apple-icon.png'));

  // 3. Next.js app icons
  await sharp(sourcePath).resize(512, 512).png().toFile(path.join(appDir, 'icon.png'));

  await sharp(sourcePath)
    .resize(1024, 1024)
    .jpeg({ quality: 95 })
    .toFile(path.join(appDir, 'icon.jpg'));

  // 4. Maskable icons
  if (fs.existsSync(adaptivePath)) {
    const whiteBg = await sharp({
      create: {
        width: 1024,
        height: 1024,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    })
      .composite([{ input: adaptivePath }])
      .png()
      .toBuffer();

    await sharp(whiteBg)
      .resize(512, 512)
      .png()
      .toFile(path.join(publicDir, 'icon-maskable-512.png'));

    await sharp(whiteBg)
      .resize(192, 192)
      .png()
      .toFile(path.join(publicDir, 'icon-maskable-192.png'));
  }

  console.log('✓ All Brandyy icons generated successfully');
}

generateIcons().catch(console.error);
