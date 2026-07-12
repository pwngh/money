/**
 * @pwngh/money
 *
 * Copyright (c) Preston Neal
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.md file in the root directory of this source tree.
 *
 * @license MIT
 */

/**
 * The consumption channels are a contract, so each is pinned here, not reviewed by
 * hand: the exports map must resolve on disk for both conditions, the built dist
 * channel must carry the same semantics as the source it was compiled from (a
 * stale dist fails loudly), and every emitted projection must be byte-faithful to
 * the constant it projects. The vendored-file channel has its own guard in
 * amalgamation.test.ts; the database channel proves itself in db-live.test.ts and
 * at consumer boot.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));

test('the exports map resolves on disk for both conditions', () => {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
    exports: Record<string, string | Record<string, string>>;
  };
  for (const [entry, target] of Object.entries(pkg.exports)) {
    const paths = typeof target === 'string' ? [target] : Object.values(target);
    for (const path of paths) {
      assert.ok(existsSync(join(root, path)), `exports['${entry}'] -> ${path} is missing`);
    }
  }
});

test('the dist channel carries the same semantics as the source', async () => {
  const [distMoney, srcMoney] = await Promise.all([
    import('@pwngh/money'),
    import('../src/money.ts'),
  ]);
  const [distFold, srcFold] = await Promise.all([
    import('@pwngh/money/fold'),
    import('../src/fold.ts'),
  ]);
  const [distDb, srcDb] = await Promise.all([
    import('@pwngh/money/db'),
    import('../src/db.ts'),
  ]);
  assert.deepEqual(distMoney.vectors, srcMoney.vectors);
  assert.deepEqual(distFold.vectors, srcFold.vectors);
  assert.deepEqual(distFold.moduleBytes(), srcFold.moduleBytes());
  assert.equal(distDb.moneySql, srcDb.moneySql);
  assert.deepEqual(distDb.moneyMysql, srcDb.moneyMysql);
  assert.equal(distMoney.ISO_4217_AMENDMENT, srcMoney.ISO_4217_AMENDMENT);
});

test('every emitted projection is byte-faithful to its source constant', async () => {
  const { vectors } = await import('../src/money.ts');
  const { moduleBytes, vectors: foldVectors } = await import('../src/fold.ts');
  const { moneyMysql, moneySql } = await import('../src/db.ts');
  const out = mkdtempSync(join(tmpdir(), 'money-emit-'));
  try {
    execFileSync(process.execPath, [join(root, 'scripts/emit.ts'), out]);
    assert.deepEqual(
      JSON.parse(readFileSync(join(out, 'money.vectors.json'), 'utf8')),
      vectors,
    );
    assert.deepEqual(
      JSON.parse(readFileSync(join(out, 'fold.vectors.json'), 'utf8')),
      foldVectors,
    );
    assert.deepEqual(new Uint8Array(readFileSync(join(out, 'fold.wasm'))), moduleBytes());
    assert.equal(readFileSync(join(out, 'money.sql'), 'utf8'), `${moneySql.trim()}\n`);
    const cli = readFileSync(join(out, 'money.mysql.sql'), 'utf8');
    for (const statement of moneyMysql) {
      assert.ok(cli.includes(statement), 'mysql projection dropped a statement');
    }
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});
