import { mkdir, copyFile, cp } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
for (const site of ['vedicvalor', 'sanskritam']) {
  const output = path.join(root, 'dist', site);
  await mkdir(output, { recursive: true });
  await copyFile(path.join(root, 'pages', `${site}.html`), path.join(output, 'index.html'));
  await cp(path.join(root, 'assets'), path.join(output, 'assets'), { recursive: true });
  await copyFile(path.join(root, '_headers'), path.join(output, '_headers'));
  await copyFile(path.join(root, `${site}-robots.txt`), path.join(output, 'robots.txt'));
  console.log(`Built ${site}: ${output}`);
}
