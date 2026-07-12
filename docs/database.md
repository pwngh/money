# The database carrier

A host-held database is never trusted to compute money correctly; it is asked.
`@pwngh/money/db` installs `div_round` and `split_bps` — the division and split
semantics reconciliation SQL re-derives — into Postgres or MySQL, then re-runs
the conformance vectors against the live engine. Parsing and the wire codec stay
application-side.

```ts
import { installPostgres, provePostgres } from '@pwngh/money/db';
import { vectors } from '@pwngh/money';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const runner = {
  run: (sql, params) => pool.query(sql, params ? [...params] : undefined).then((r) => r.rows),
};

await installPostgres(runner); // idempotent DDL; safe at every boot
const failures = await provePostgres(runner, vectors);
if (failures.length > 0) throw new Error(failures[0]); // refuse a nonconformant engine
```

`installMysql`/`proveMysql` are the MySQL pair. Results cross the wire as strings
so no driver's number handling can corrupt an i64, and a `meta` version stamp
turns install/package skew into a named failure.

## The runner

The driver enters structurally — `SqlRunner` is one method, so any driver or test
fake adapts in a line. The mysql2 shape:

```ts
const runner = {
  run: (sql, params) =>
    connection.query(sql, params ? [...params] : undefined).then(([rows]) => rows),
};
```

## The psql path

No application required. `npm run emit -- out/` projects the DDL to
`out/money.sql` (Postgres) and `out/money.mysql.sql` (DELIMITER-wrapped for the
mysql CLI). The Postgres file also installs a vectors table and a `money.prove()`
function, so a DBA can load the vectors and assert conformance entirely inside
psql — `make prove-sql` in this repo is that flow end to end.

## What failure means

`install*` is idempotent self-repair, so a prove failure after install means the
engine itself computes different arithmetic than this package — a version, mode,
or platform difference worth refusing to run against. Both engines are proven in
this repo's suite (env-gated: `MONEY_POSTGRES_URL`, `MONEY_MYSQL_URL`; drivers
host-supplied, e.g. `npm i --no-save pg mysql2`).
