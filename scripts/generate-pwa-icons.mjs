import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outDir = path.join(root, "public", "icons");

function barbellSvg(size, options = { safeInset: 0 }) {
  const { safeInset } = options;
  const inner = size - safeInset * 2;
  const thick = Math.round(inner * 0.07);
  const r = Math.round(thick * 0.45);
  const cx = size / 2;
  const cy = size / 2;
  const arm = Math.round(inner * 0.32);
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="100%" height="100%" fill="#0f1118"/>
  <g fill="#00f0ff">
    <rect x="${safeInset + (inner - arm * 2 - thick) / 2}" y="${cy - thick / 2}" width="${arm * 2 + thick}" height="${thick}" rx="${r}"/>
    <rect x="${cx - thick / 2}" y="${cy - arm - thick / 2}" width="${thick}" height="${arm * 2 + thick}" rx="${r}"/>
  </g>
</svg>`.trim();
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });

  const regular512 = Buffer.from(barbellSvg(512));
  const maskable512 = Buffer.from(barbellSvg(512, { safeInset: Math.round(512 * 0.1) }));

  await sharp(regular512).resize(192, 192).png().toFile(path.join(outDir, "icon-192.png"));
  await sharp(regular512).png().toFile(path.join(outDir, "icon-512.png"));
  await sharp(maskable512).png().toFile(path.join(outDir, "icon-512-maskable.png"));
}

await main();
