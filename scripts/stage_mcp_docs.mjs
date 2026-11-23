import { copyFileSync, mkdirSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

export function stageMcpDocs(source, destination) {
  const files = [];
  const versions = {};

  function collect(directory, relative) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue;
      const path = join(directory, entry.name);
      const target = join(relative, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`Symlinks are not publishable: ${path}`);
      if (entry.isDirectory()) collect(path, target);
      else if (entry.isFile() && entry.name.endsWith('.md')) files.push([path, target]);
    }
  }

  for (const entry of readdirSync(source, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'latest') continue;
    if (!entry.isDirectory()) throw new Error(`Expected a version directory: ${entry.name}`);
    const before = files.length;
    collect(join(source, entry.name), entry.name);
    versions[entry.name] = files.length - before;
    if (!versions[entry.name]) throw new Error(`No Markdown files in ${entry.name}`);
  }
  if (!versions.development || !Object.keys(versions).some(v => /^\d+\.\d+$/.test(v))) {
    throw new Error('Publishing requires development and at least one released edition');
  }

  // Validate the whole source before creating a mirror that can delete remote objects.
  mkdirSync(destination);
  for (const [sourcePath, relative] of files) {
    const destinationPath = join(destination, relative);
    mkdirSync(resolve(destinationPath, '..'), { recursive: true });
    copyFileSync(sourcePath, destinationPath);
  }
  return versions;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [, , source, destination] = process.argv;
  if (!source || !destination) throw new Error('Usage: node stage_mcp_docs.mjs SOURCE DESTINATION');
  console.log(JSON.stringify(stageMcpDocs(source, destination), null, 2));
}
