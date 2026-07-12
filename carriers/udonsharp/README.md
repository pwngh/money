# Money — Udon fold carrier

`com.pwngh.money` — the [`@pwngh/money`](https://github.com/pwngh/money) balance
fold for hosts that load no WebAssembly. Udon runs no WASM, so the fold is
reimplemented here in plain C# and pinned to the same conformance vectors the
WASM kernel is (`fold.vectors.json`, from `npm run emit`). It never reads the
TypeScript; a carrier is done when the full vector set passes, not before.

## What it is

A left fold whose running sum is bounds-checked at every step: an intermediate
that leaves i64 range traps even when the final total would fit, because a
balance fold that passes silently through an unrepresentable state is not
auditable. A single `long` accumulator carries it — overflow is caught with the
same signed-overflow test the kernel uses, so there is no dependency on 128-bit
intermediates or on exceptions.

## Layout

```
com.pwngh.money/
  package.json            UPM manifest
  Runtime/
    Pwngh.Money.asmdef    engine-independent assembly (no UnityEngine references)
    MoneyFold.cs          the fold, namespace Pwngh.Money
  README.md  CHANGELOG.md  LICENSE.md
```

The runtime assembly references nothing, so it compiles anywhere and a world
script references the `Pwngh.Money` assembly to call it.

## Use

```csharp
using Pwngh.Money;

long total = MoneyFold.Fold(deltas, out bool overflowed);
if (overflowed) { /* an intermediate left i64 range; reject the batch */ }

// Or straight from the vector shape (decimal i64 strings), where false is `throws`:
if (MoneyFold.TryFold(row, out long sum)) { /* sum */ }
```

## Proving it

Feed each `fold.vectors.json` row's values to `TryFold`: a `throws` row must
return `false`, every other row must return `true` with the stated sum. The
vectors are byte-identical to the constants embedded in the source, so a passing
carrier cannot have drifted from the code that made them.
