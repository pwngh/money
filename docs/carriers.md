# Carriers

A carrier is any second implementation of these semantics — a vendored copy,
C#, SQL, UdonSharp. Carriers never consume the TypeScript; they consume the
conformance vectors, and a carrier is done when the full set passes, not before.

```bash
npm run emit -- out/
# money.vectors.json  fold.vectors.json  fold.wasm  money.sql  money.mysql.sql
```

The vectors are JSON-safe (bigints carried as strings) and byte-identical to the
constants embedded in the source — pinned by this repo's suite, so a projection
can never drift from the code that made it.

## What the vectors force

Every semantic that host languages disagree on is a named vector:

- **Negative quotients and ties**, per mode, across all four sign combinations
  (`±7/±2` under `floor`/`ceil`/`trunc`/`halfEven`/`halfUp`).
- **128-bit intermediates**: `muldiv` vectors sit near `I64_MAX · 10⁴`, so a
  carrier on native 64-bit integers must widen or fail the suite (C# uses
  `Int128`; SQL uses `numeric`/`DECIMAL`).
- **Order-sensitive folding**: `[MAX, 1, −2]` must trap while `[−2, 1, MAX]`
  succeeds — the fold checks every step.
- **Truncation toward zero** in splits, including negative-split behavior.
- **One canonical wire string per value** — re-encode must equal input.

## Existing carriers

- **SQL** — Postgres and MySQL dialects ship in `@pwngh/money/db`; see
  [The database carrier](database.md).
- **C#** — `carriers/csharp/` in this repo: a console runner over
  `money.vectors.json`, all twelve vector families, exit code = failure count.
  The arithmetic is a documented `Pwngh.Money` surface in `Runtime/Money.cs`;
  the runner only dispatches. `make prove-csharp`.
- **WASM hosts** — .NET and Unity load the emitted `fold.wasm` via wasmtime;
  loaders that allow nothing (Udon) reimplement the fold against
  `fold.vectors.json`.
- **Udon** — `carriers/udonsharp/` in this repo: the `com.pwngh.money` UPM
  package, a plain-C# `MoneyFold` pinned to the fold vectors, for the host that
  loads no WASM.

A new carrier follows the same recipe: read the vector families in
[money-spec.md](../money-spec.md), implement, run the set, ship when it is empty.
