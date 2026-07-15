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

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { vectors as moneyVectors } from '../src/money.ts';
import { moneyMysql, moneySql } from '../src/db.ts';
import { moduleBytes, vectors as foldVectors } from '../src/fold.ts';

const out = process.argv[2] ?? '.';
mkdirSync(out, { recursive: true });
writeFileSync(
  join(out, 'money.vectors.json'),
  `${JSON.stringify(moneyVectors, null, 2)}\n`,
);
writeFileSync(
  join(out, 'fold.vectors.json'),
  `${JSON.stringify(foldVectors, null, 2)}\n`,
);
writeFileSync(join(out, 'fold.wasm'), moduleBytes());
writeFileSync(join(out, 'money.sql'), `${moneySql.trim()}\n`);
const mysqlCli = [
  'delimiter //',
  ...moneyMysql.map((s) => `${s}//`),
  'delimiter ;',
].join('\n\n');
writeFileSync(join(out, 'money.mysql.sql'), `${mysqlCli}\n`);
console.log(
  `emitted money.vectors.json fold.vectors.json fold.wasm money.sql money.mysql.sql -> ${out}`,
);
