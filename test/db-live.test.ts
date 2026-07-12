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
 * The database channel, proven against live engines from this repo's own suite.
 * Gated twice, both explicit: an engine registers only when its URL env var is
 * set, and skips visibly when the driver is not installed (this package keeps
 * zero dependencies, so drivers arrive only when a host supplies them, e.g.
 * `npm i --no-save pg mysql2`). Consumers additionally prove at boot; this test
 * is the channel's guard where it lives.
 *
 *   MONEY_POSTGRES_URL=postgres://... MONEY_MYSQL_URL=mysql://... npm test
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { installMysql, installPostgres, proveMysql, provePostgres } from '@pwngh/money/db';
import { vectors } from '@pwngh/money';

import type { SqlRunner } from '@pwngh/money/db';

const postgresUrl = process.env.MONEY_POSTGRES_URL;
const mysqlUrl = process.env.MONEY_MYSQL_URL;

// Optional drivers resolve by variable specifier so the typecheck of this
// zero-dependency package never requires them to be installed.
const pgSpecifier = 'pg';
const mysqlSpecifier = 'mysql2/promise';

if (postgresUrl) {
  test('a live Postgres implements the semantics (install + prove)', async (t) => {
    const pg = (await import(pgSpecifier).catch(() => null)) as null | {
      default: { Pool: new (options: object) => PoolLike };
    };
    if (pg === null) return t.skip('pg driver not installed');
    const pool = new pg.default.Pool({ connectionString: postgresUrl, max: 2 });
    const runner: SqlRunner = {
      run: (sql, params) =>
        pool.query(sql, params ? [...params] : undefined).then((r) => r.rows),
    };
    try {
      await installPostgres(runner);
      assert.deepEqual(await provePostgres(runner, vectors), []);
    } finally {
      await pool.end();
    }
  });
}

if (mysqlUrl) {
  test('a live MySQL implements the semantics (install + prove)', async (t) => {
    const mysql = (await import(mysqlSpecifier).catch(() => null)) as null | {
      default: { createConnection: (url: string) => Promise<ConnectionLike> };
    };
    if (mysql === null) return t.skip('mysql2 driver not installed');
    const connection = await mysql.default.createConnection(mysqlUrl);
    const runner: SqlRunner = {
      run: (sql, params) =>
        connection
          .query(sql, params ? [...params] : undefined)
          .then(([rows]) => rows as Record<string, unknown>[]),
    };
    try {
      await installMysql(runner);
      assert.deepEqual(await proveMysql(runner, vectors), []);
    } finally {
      await connection.end();
    }
  });
}

interface PoolLike {
  query(sql: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
  end(): Promise<void>;
}

interface ConnectionLike {
  query(sql: string, params?: unknown[]): Promise<[unknown, unknown]>;
  end(): Promise<void>;
}
