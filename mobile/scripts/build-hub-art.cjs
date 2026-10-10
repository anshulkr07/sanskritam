// Optimize new hub paintings; originals remain in the generated-images folder.
const fs = require("node:fs");
const path = require("node:path");
const sharp = require(process.argv[2] || "sharp");
const root = path.resolve(__dirname, "../..");
const manifestPath = path.join(root, "specs/hub-art/manifest.json");
async function main() {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  for (const art of manifest) {
    const output = path.join(root, "mobile/assets/hubs", art.file);
    if (fs.existsSync(output) || !art.sourcePath) continue;
    await sharp(art.sourcePath).resize({ width: art.kind === "wide" ? 1200 : 600, withoutEnlargement: true }).webp({ quality: 86 }).toFile(output);
    art.status = "complete";
  }
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
