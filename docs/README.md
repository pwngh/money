# @pwngh/money documentation

For consumers of the package. Each page is one concept.

1. [Getting started](getting-started.md) — install, amounts, rounding, splits,
   the wire.
2. [Vendoring](vendoring.md) — take the file instead of the dependency, with a
   drift guard.
3. [The fold](fold.md) — checked i64 summation in WebAssembly, zero-copy.
4. [The database carrier](database.md) — make a host's Postgres or MySQL prove it
   computes the same arithmetic.
5. [Carriers](carriers.md) — port the semantics to another language against the
   conformance vectors.
