import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { stageMcpDocs } from './stage_mcp_docs.mjs';

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'mcp-docs-test-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const source = join(root, 'versions');
  mkdirSync(source);
  const put = (name, content = '# Docs') => {
    const path = join(source, name);
    mkdirSync(join(path, '..'), { recursive: true });
    writeFileSync(path, content);
  };
  return { source, destination: join(root, 'staged'), put };
}

test('stages released editions and development, preserving paths and content', t => {
  const { source, destination, put } = fixture(t);
  put('1.9/index.md');
  put('1.10/platform/workspaces.md', '# Workspaces\n');
  put('development/index.md');
  put('latest/index.md');
  put('1.10/image.png');
  put('development/.private/secret.md');
  assert.deepEqual(stageMcpDocs(source, destination), { '1.9': 1, '1.10': 1, development: 1 });
  assert.equal(readFileSync(join(destination, '1.10/platform/workspaces.md'), 'utf8'), '# Workspaces\n');
  assert.equal(existsSync(join(destination, 'latest')), false);
  assert.equal(existsSync(join(destination, '1.10/image.png')), false);
  assert.equal(existsSync(join(destination, 'development/.private')), false);
});

test('rejects empty or incomplete sources before creating output', t => {
  const { source, destination, put } = fixture(t);
  assert.throws(() => stageMcpDocs(source, destination), /requires development/);
  put('development/index.md');
  assert.throws(() => stageMcpDocs(source, destination), /requires development/);
  mkdirSync(join(source, '1.10'));
  assert.throws(() => stageMcpDocs(source, destination), /No Markdown/);
  assert.equal(existsSync(destination), false);
});

test('rejects symlinks and refuses to overwrite existing output', t => {
  const { source, destination, put } = fixture(t);
  put('1.10/index.md');
  put('development/index.md');
  symlinkSync(join(source, '1.10/index.md'), join(source, 'development/link.md'));
  assert.throws(() => stageMcpDocs(source, destination), /Symlinks/);
  assert.equal(existsSync(destination), false);
  rmSync(join(source, 'development/link.md'));
  stageMcpDocs(source, destination);
  assert.throws(() => stageMcpDocs(source, destination), /EEXIST/);
});
