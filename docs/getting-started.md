# Getting started

## Install

```bash
npm install @pwngh/money
```

Node ≥ 22.18. Runtime imports resolve to the compiled `dist/`, so bare Node works
with no loader; TypeScript resolves types to the `.ts` source, so what your editor
shows is the reviewed file. Zero runtime dependencies.

## Amounts

An `Amount` is `{ currency: string; minor: bigint }` — minor units, so `$12.34`
is `1234n`. Every operation checks its result into the signed 64-bit range and
throws `RangeError` past it; overflow is an error, never a silent promotion.

```ts
import { amount, add, exponent } from '@pwngh/money';

const price = amount('USD', 1234n);
const total = add(price, price); // { currency: 'USD', minor: 2468n }
exponent('JPY'); // 0 — minor units per whole, complete through ISO 4217 Amendment 180
```

`currency` is an open string: any `[A-Z]{3,12}` token is legal, so private
currencies like `CREDIT` work. Unlisted codes have exponent 2.

## Rounding is named, never implied

Languages disagree on negative division (`-7/2` is `-4` floored, `-3` truncated),
so every division here takes its rounding mode at the call site: `floor`, `ceil`,
`trunc`, `halfEven` (banker's), or `halfUp` (tax statutes).

```ts
import { divRound, mulDiv, convert } from '@pwngh/money';

divRound(-7n, 2n, 'floor'); // -4n
mulDiv(price.minor, 250n, 10_000n, 'floor'); // 2.5% fee, rounded down
convert(price, 'JPY', { num: 15123n, den: 100n }, 'halfEven'); // rational rate, one rounding
```

`convert` builds the cross-exponent rescale (`10^(expTo − expFrom)`) into the same
single division. Rates are exact rationals; no float ever touches a value.

## Splits that conserve

```ts
import { allocate, splitBps } from '@pwngh/money';

allocate(100n, [1n, 1n, 1n]); // [34n, 33n, 33n] — sums to the input exactly
splitBps(101n, [5000, 5000]); // { shares: [50n, 50n], remainder: 1n } — caller keeps the remainder
```

`allocate` distributes the remainder to the largest fractional parts (ties to the
lower index). `splitBps` floors each basis-point share and returns what is left.

## The wire

`encode` produces exactly one string per value — `USD:1234`, minor units, no
leading zeros, no `-0` — so equality is byte equality and a database can compare
amounts as text. `decode` and `parse` are the untrusted boundaries: they return
`null` for every bad input instead of throwing.

```ts
import { encode, decode, format, parse } from '@pwngh/money';

encode(price); // 'USD:1234'
decode('USD:1234'); // { currency: 'USD', minor: 1234n }
format(1234n, 2); // '12.34' (locale-free; separators are explicit options)
parse('12.34', 2); // 1234n; parse('12.345', 2) is null — never silently truncated
```

## Prove it at boot

Every entry embeds its conformance vectors and a pure self-check. Assert it once
at startup — no framework needed:

```ts
import { selfTest } from '@pwngh/money';

if (selfTest().length > 0) throw new Error('money semantics drifted');
```

`prove()` goes further: 500 fixed-seed samples of round-trip, conservation, and
rounding-bound laws, so any failure is a reproducible counterexample.
