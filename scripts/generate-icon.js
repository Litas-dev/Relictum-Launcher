const fs = require('fs');
const path = require('path');
const Jimp = require('jimp');
const pngToIcoModule = require('png-to-ico');
const pngToIco = pngToIcoModule.default || pngToIcoModule;

async function main() {
  const pngPath = path.resolve(__dirname, '../build/icon.png');
  const outIcoPath = path.resolve(__dirname, '../build/icon.ico');

  if (!fs.existsSync(pngPath)) {
    console.error(`Source PNG not found at ${pngPath}`);
    process.exit(1);
  }

  try {
    const img = await Jimp.read(pngPath);
    // Auto-crop transparent padding to avoid tiny-looking icons
    img.autocrop({ tolerance: 0.0001, cropOnlyFrames: false });
    // Ensure square canvas
    const size = Math.max(img.bitmap.width, img.bitmap.height);
    const canvas = new Jimp(size, size, 0x00000000);
    const x = (size - img.bitmap.width) / 2;
    const y = (size - img.bitmap.height) / 2;
    canvas.composite(img, x, y);

    // Save a high-res temporary PNG for ICO generation
    const tmpPng = path.resolve(__dirname, '../build/icon.tmp.png');
    await canvas.resize(1024, 1024).writeAsync(tmpPng);

    const icoBuffer = await pngToIco(tmpPng);
    fs.writeFileSync(outIcoPath, icoBuffer);
    fs.unlinkSync(tmpPng);
    console.log(`Generated multi-size ICO at ${outIcoPath}`);
  } catch (err) {
    console.error('Failed to generate icon.ico:', err);
    process.exit(1);
  }
}

main();
