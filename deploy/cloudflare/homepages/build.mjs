import { mkdir, copyFile, cp, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(root, 'dist');
for (const site of ['vedicvalor', 'sanskritam']) {
  const output = path.resolve(dist, site);
  // Delete only these two generated folders, with a checked absolute parent.
  if (path.dirname(output) !== dist) throw new Error('Output must stay inside dist');
  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  await copyFile(path.join(root, 'pages', `${site}.html`), path.join(output, 'index.html'));
  await cp(path.join(root, 'assets'), path.join(output, 'assets'), { recursive: true });
  await copyFile(path.join(root, '_headers'), path.join(output, '_headers'));
  await copyFile(path.join(root, `${site}-robots.txt`), path.join(output, 'robots.txt'));
  console.log(`Built ${site}: ${output}`);
}
