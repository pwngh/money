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

import test from 'node:test';
import assert from 'node:assert/strict';
import { createFold, moduleBytes, selfTest, vectors } from '@pwngh/money/fold';

test(`fold conformance: ${vectors.length} vectors + cross-check`, () => {
  assert.deepEqual(selfTest(), []);
});

test('module assembly is deterministic and 125 bytes, as documented', () => {
  assert.deepEqual(moduleBytes(), moduleBytes());
  assert.equal(moduleBytes().length, 125);
});

const gc = (globalThis as { gc?: () => void }).gc;

test(
  'the zero-copy fold allocates nothing per call',
  { skip: gc === undefined },
  () => {
    const folder = createFold();
    const count = 1 << 16;
    const column = folder.view(count);
    column.fill(1n);
    gc?.();
    const before = process.memoryUsage().heapUsed;
    let total = 0n;
    for (let i = 0; i < 200; i += 1) {
      total += folder.fold(column);
    }
    gc?.();
    const grown = process.memoryUsage().heapUsed - before;
    assert.equal(total, 200n * BigInt(count));
    assert.ok(grown < 4_000_000, `heap grew ${grown} bytes over 200 folds`);
  },
);
