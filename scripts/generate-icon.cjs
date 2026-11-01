const fs = require('fs');
const path = require('path');

const pngPath = path.resolve(__dirname, '../public/Garage-crm-logo.png');
if (!fs.existsSync(pngPath)) {
  console.error('PNG file not found:', pngPath);
  process.exit(1);
}

const pngBuffer = fs.readFileSync(pngPath);

// Windows Vista+ ICO format wrapping valid PNG:
// Header (6 bytes) + Directory Entry (16 bytes) = 22 bytes
const header = Buffer.alloc(22);

// Header
header.writeUInt16LE(0, 0); // Reserved. Must always be 0.
header.writeUInt16LE(1, 2); // Specifies image type: 1 for icon (.ICO) image.
header.writeUInt16LE(1, 4); // Specifies number of images in the file.

// Directory Entry 1
header.writeUInt8(0, 6);    // Image width in pixels: 0 means 256 pixels
header.writeUInt8(0, 7);    // Image height in pixels: 0 means 256 pixels
header.writeUInt8(0, 8);    // Number of colors in the color palette: 0 = no palette
header.writeUInt8(0, 9);    // Reserved. Should be 0.
header.writeUInt16LE(1, 10); // Color planes: 1
header.writeUInt16LE(32, 12); // Bits per pixel: 32
header.writeUInt32LE(pngBuffer.length, 14); // Size of the image's data in bytes
header.writeUInt32LE(22, 18); // Offset of BMP or PNG data from the beginning of the ICO file

const icoBuffer = Buffer.concat([header, pngBuffer]);

// Target destinations
const targets = [
  path.resolve(__dirname, '../app.ico'),
  path.resolve(__dirname, '../public/favicon.ico'),
  path.resolve(__dirname, '../installer/app.ico'),
];

targets.forEach((dest) => {
  const dir = path.dirname(dest);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(dest, icoBuffer);
  console.log('Generated ICO at:', dest);
});

