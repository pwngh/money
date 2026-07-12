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
 * Vendoring is a compatibility surface, not a habit: any consumer may copy any
 * src file unchanged into its own tree, forever. This test is that promise made
 * machine-checkable — a release that gives an amalgamation an import statement,
 * or takes away the selfTest a vendored copy is guarded by, fails here before it
 * ships.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const src = new URL('../src', import.meta.url).pathname;

test('every src file is a zero-import amalgamation', () => {
  for (const name of readdirSync(src)) {
    const imports = readFileSync(join(src, name), 'utf8').match(/^import /gm) ?? [];
    assert.equal(
      imports.length,
      0,
      `${name} has ${imports.length} import(s); vendoring breaks`,
    );
  }
});

test('the self-verifying entries export their drift guard', async () => {
  for (const entry of ['../src/money.ts', '../src/fold.ts']) {
    const module = (await import(entry)) as { selfTest?: unknown; vectors?: unknown };
    assert.equal(typeof module.selfTest, 'function', `${entry} must export selfTest`);
    assert.ok(Array.isArray(module.vectors), `${entry} must export vectors`);
  }
});
