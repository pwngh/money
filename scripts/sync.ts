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
 * Pushes the amalgamations to every vendored consumer and reference copy, then
 * verifies each landed byte-identical — so "update the vendored copies" is one
 * command (`make sync`), not discipline. Consumers that are absent on this
 * machine are skipped and named; each consumer's own suite remains the semantic
 * guard (its embedded selfTest), this script only guarantees the bytes.
 *
 *   node scripts/sync.ts
 */

import { copyFileSync, existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const packageRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const workspaceRoot = resolve(packageRoot, '..');

const targets: ReadonlyArray<readonly [string, string]> = [
  ['src/money.ts', 'economy-lab-git/economy-lab/src/money.vendored.ts'],
  ['src/db.ts', 'economy-lab-git/economy-lab/src/db.vendored.ts'],
  ['src/money.ts', 'economy-edge/src/canonical/money.vendored.ts'],
  ['src/money.ts', 'pwngh-artifacts/house-style/references/exemplar-money.ts'],
  ['src/fold.ts', 'pwngh-artifacts/house-style/references/exemplar-fold.ts'],
];

let synced = 0;
let skipped = 0;
for (const [source, target] of targets) {
  const from = resolve(packageRoot, source);
  const to = resolve(workspaceRoot, target);
  if (!existsSync(to)) {
    skipped += 1;
    console.log(`skipped (absent on this machine): ${target}`);
    continue;
  }
  copyFileSync(from, to);
  if (readFileSync(from, 'utf8') !== readFileSync(to, 'utf8')) {
    throw new Error(`sync verify failed: ${target} is not byte-identical after copy`);
  }
  synced += 1;
  console.log(`synced: ${target}`);
}
console.log(`${synced} synced, ${skipped} skipped — run each consumer's check to re-prove.`);
