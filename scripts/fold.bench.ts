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
 * Floor benchmark for the fold: bigint reference vs the assembled WASM module,
 * parity-asserted before timing. Reports the best of seven warmed runs, rounded
 * down — a floor for this machine only, reproducible by running this script.
 *
 *   node scripts/fold.bench.ts [elements]   (default 1,000,000)
 */

import { cpus } from 'node:os';

import { createFold, foldRef } from '../src/fold.ts';

const count = Number(process.argv[2] ?? 1_000_000);
const values = new BigInt64Array(count);
let seed = 88172645463325252n;
for (let i = 0; i < count; i += 1) {
  seed = (seed * 6364136223846793005n + 1442695040888963407n) & 0xffffffffffffffffn;
  values[i] = BigInt.asIntN(64, seed) >> 20n;
}

const folder = createFold();
const want = foldRef(values);
if (folder.fold(values) !== want) throw new Error('parity failure: wasm !== ref');

function floorOf(run: () => bigint): number {
  for (let i = 0; i < 3; i += 1) run();
  let best = Infinity;
  for (let i = 0; i < 7; i += 1) {
    const start = process.hrtime.bigint();
    run();
    const elapsed = Number(process.hrtime.bigint() - start);
    if (elapsed < best) best = elapsed;
  }
  return Math.floor((count / best) * 1e9);
}

const ref = floorOf(() => foldRef(values));
const wasm = floorOf(() => folder.fold(values));
const column = folder.view(count);
column.set(values);
const zeroCopy = floorOf(() => folder.fold(column));

console.log(`fold floor, ${count} i64 elements, best of 7 warmed runs, this machine only`);
console.log(`  ${process.version}, ${cpus()[0]?.model ?? 'unknown cpu'}`);
console.log(`  ref  (bigint):          ${ref.toLocaleString('en-US')} elements/s`);
console.log(`  wasm (i64, copy-in):    ${wasm.toLocaleString('en-US')} elements/s`);
console.log(`  wasm (i64, zero-copy):  ${zeroCopy.toLocaleString('en-US')} elements/s`);
