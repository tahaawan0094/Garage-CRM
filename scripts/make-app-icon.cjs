const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

// Load original logo
const srcPath = path.resolve(__dirname, '../public/Garage-crm-logo.png');
const src = PNG.sync.read(fs.readFileSync(srcPath));

// Target canvas: 256x256
const W = 256;
const H = 256;
const dst = new PNG({ width: W, height: H });

// Rounded rectangle geometry (modern squircle)
const pad = 12;
const rw = W - pad * 2; // 232
const rh = H - pad * 2; // 232
const radius = 48;

// Logo placement: nicely padded and centered
const logoPad = 34;
const logoW = W - logoPad * 2; // 188
const logoH = H - logoPad * 2; // 188
const logoX0 = logoPad;
const logoY0 = logoPad;

for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const idx = (y * W + x) * 4;

    // Distance to rounded rectangle boundary for anti-aliased corners
    let dist = 0;
    const left = pad;
    const right = pad + rw;
    const top = pad;
    const bottom = pad + rh;

    if (x < left || x >= right || y < top || y >= bottom) {
      dist = -1;
    } else {
      const cx = x < left + radius ? left + radius : (x > right - radius ? right - radius : x);
      const cy = y < top + radius ? top + radius : (y > bottom - radius ? bottom - radius : y);
      const cornerDist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      if (cornerDist > radius) {
        dist = -1;
      } else {
        dist = Math.min(1, Math.max(0, radius - cornerDist));
      }
    }

    if (dist <= 0) {
      dst.data[idx] = 0;
      dst.data[idx + 1] = 0;
      dst.data[idx + 2] = 0;
      dst.data[idx + 3] = 0;
      continue;
    }

    // Modern Garage Orange Gradient (#ff631c -> #e54b00)
    const gradT = (y - pad) / rh;
    let bgR = Math.round(255 - gradT * 25);
    let bgG = Math.round(99 - gradT * 24);
    let bgB = Math.round(28 - gradT * 28);
    let bgA = Math.round(dist * 255);

    // Subtle 1px inner top highlight
    if (y === top && dist > 0.8) {
      bgR = Math.min(255, bgR + 35);
      bgG = Math.min(255, bgG + 25);
      bgB = Math.min(255, bgB + 20);
    }

    // Logo overlay
    if (x >= logoX0 && x < logoX0 + logoW && y >= logoY0 && y < logoY0 + logoH) {
      const u = (x - logoX0) / logoW;
      const v = (y - logoY0) / logoH;
      const srcX = Math.min(src.width - 1, Math.max(0, Math.floor(u * src.width)));
      const srcY = Math.min(src.height - 1, Math.max(0, Math.floor(v * src.height)));
      const sIdx = (srcY * src.width + srcX) * 4;

      const sA = src.data[sIdx + 3] / 255;
      if (sA > 0.05) {
        // Pure crisp white logo on top of orange rounded square
        const alpha = sA;
        bgR = Math.round(255 * alpha + bgR * (1 - alpha));
        bgG = Math.round(255 * alpha + bgG * (1 - alpha));
        bgB = Math.round(255 * alpha + bgB * (1 - alpha));
      }
    }

    dst.data[idx] = bgR;
    dst.data[idx + 1] = bgG;
    dst.data[idx + 2] = bgB;
    dst.data[idx + 3] = bgA;
  }
}

const pngBuffer = PNG.sync.write(dst, { deflateLevel: 9 });

// Save preview PNG
fs.writeFileSync(path.resolve(__dirname, '../public/app-icon-preview.png'), pngBuffer);

// Build .ICO file (256x256)
const header = Buffer.alloc(22);
header.writeUInt16LE(0, 0);                 // Reserved
header.writeUInt16LE(1, 2);                 // ICO Type
header.writeUInt16LE(1, 4);                 // 1 Image
header.writeUInt8(0, 6);                    // 256px
header.writeUInt8(0, 7);                    // 256px
header.writeUInt8(0, 8);                    // Palette
header.writeUInt8(0, 9);                    // Reserved
header.writeUInt16LE(1, 10);                // Planes
header.writeUInt16LE(32, 12);               // 32-bit BPP
header.writeUInt32LE(pngBuffer.length, 14); // Size
header.writeUInt32LE(22, 18);               // Offset (22)

const icoBuffer = Buffer.concat([header, pngBuffer]);

// Write out to all target icon locations
[
  path.resolve(__dirname, '../installer/app.ico'),
  path.resolve(__dirname, '../app.ico'),
  path.resolve(__dirname, '../public/favicon.ico'),
  path.resolve(__dirname, '../dist/favicon.ico'),
].forEach(target => {
  const dir = path.dirname(target);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(target, icoBuffer);
  console.log('Saved ICO to:', target);
});

console.log('App Icon ready! Size:', icoBuffer.length, 'bytes');
