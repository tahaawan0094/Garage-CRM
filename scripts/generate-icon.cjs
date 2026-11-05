const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const inputPath = path.resolve(__dirname, '../public/Garage-crm-logo.png');
const inputBuffer = fs.readFileSync(inputPath);
const srcPng = PNG.sync.read(inputBuffer);

console.log(`Original image: ${srcPng.width}x${srcPng.height}, bytes: ${inputBuffer.length}`);

// Downsample function using bilinear/box interpolation for clean edges
function resizePNG(src, targetW, targetH) {
  const dst = new PNG({ width: targetW, height: targetH });
  const xRatio = src.width / targetW;
  const yRatio = src.height / targetH;

  for (let y = 0; y < targetH; y++) {
    for (let x = 0; x < targetW; x++) {
      const srcX = Math.min(Math.floor(x * xRatio), src.width - 1);
      const srcY = Math.min(Math.floor(y * yRatio), src.height - 1);
      
      const srcIdx = (srcY * src.width + srcX) * 4;
      const dstIdx = (y * targetW + x) * 4;

      dst.data[dstIdx] = src.data[srcIdx];         // R
      dst.data[dstIdx + 1] = src.data[srcIdx + 1]; // G
      dst.data[dstIdx + 2] = src.data[srcIdx + 2]; // B
      dst.data[dstIdx + 3] = src.data[srcIdx + 3]; // A
    }
  }
  return dst;
}

// Generate 256x256 PNG
const png256 = resizePNG(srcPng, 256, 256);
const png256Buffer = PNG.sync.write(png256, { deflateLevel: 9 });

console.log(`Resized 256x256 PNG size: ${png256Buffer.length} bytes`);

// Build 256x256 ICO container
const header = Buffer.alloc(22);
header.writeUInt16LE(0, 0);                 // Reserved
header.writeUInt16LE(1, 2);                 // ICO Type (1)
header.writeUInt16LE(1, 4);                 // Image Count (1)

// Directory entry
header.writeUInt8(0, 6);                    // Width (0 = 256px)
header.writeUInt8(0, 7);                    // Height (0 = 256px)
header.writeUInt8(0, 8);                    // Color palette
header.writeUInt8(0, 9);                    // Reserved
header.writeUInt16LE(1, 10);                // Color planes
header.writeUInt16LE(32, 12);               // BPP (32-bit RGBA)
header.writeUInt32LE(png256Buffer.length, 14); // Image data size
header.writeUInt32LE(22, 18);               // Offset to image data

const icoBuffer = Buffer.concat([header, png256Buffer]);
console.log(`Final .ICO size: ${icoBuffer.length} bytes`);

// Write to all target locations
const targets = [
  path.resolve(__dirname, '../installer/app.ico'),
  path.resolve(__dirname, '../app.ico'),
  path.resolve(__dirname, '../public/favicon.ico'),
];

targets.forEach((dest) => {
  const dir = path.dirname(dest);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(dest, icoBuffer);
  console.log('Successfully wrote ICO to:', dest);
});
