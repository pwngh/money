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
import { prove, selfTest, vectors } from '@pwngh/money';

test(`money conformance: ${vectors.length} vectors`, () => {
  assert.deepEqual(selfTest(), []);
});

test('money laws hold (prove)', () => {
  assert.deepEqual(prove(), []);
});
