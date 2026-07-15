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
import {
  DB_VERSION,
  moneyMysql,
  moneySql,
  proveMysql,
  provePostgres,
} from '@pwngh/money/db';
import { vectors } from '@pwngh/money';

test('db carrier ships both dialects and a version stamp', () => {
  assert.ok(
    moneySql.includes('money.div_round') &&
      moneySql.includes('money.split_bps'),
  );
  assert.ok(moneySql.includes(`select ${DB_VERSION} where not exists`));
  assert.ok(moneyMysql.some((s) => s.includes('money_div_round')));
  assert.ok(moneyMysql.some((s) => s.includes('money_split_bps')));
  assert.ok(
    moneyMysql.some((s) => s.includes(`select ${DB_VERSION} from dual`)),
  );
});

test('prove* fails loudly against a database with no install', async () => {
  const dead = { run: () => Promise.reject(new Error('no such table')) };
  for (const prove of [provePostgres, proveMysql]) {
    const failures = await prove(dead, vectors);
    assert.equal(failures.length, 1);
    assert.match(failures[0] ?? '', /meta version unreadable/);
  }
});
