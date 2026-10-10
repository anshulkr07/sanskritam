// Optimize generated paintings without changing the originals. Uses bundled
// sharp when it is not installed locally; pass its module path as argument 1.
const fs = require("node:fs");
const path = require("node:path");
const sharp = require(process.argv[2] || "sharp");
const root = path.resolve(__dirname, "../..");
const manifestPath = path.join(root, "specs/path-art/manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

async function main() {
  let added = 0;
  for (const art of manifest) {
    const output = path.join(root, "mobile/assets/path", art.file);
    if (fs.existsSync(output)) continue;
    if (!art.sourcePath) continue;
    await sharp(art.sourcePath)
      .resize({ width: art.kind === "hero" ? 1200 : 600, withoutEnlargement: true })
      .webp({ quality: 86 })
      .toFile(output);
    art.status = "complete";
    added++;
  }
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`Optimized ${added} paintings; ${manifest.filter(a => fs.existsSync(path.join(root, "mobile/assets/path", a.file))).length}/${manifest.length} ready.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
