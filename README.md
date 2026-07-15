# @pwngh/money

Minor-unit integer money for TypeScript.

An amount is a currency code plus a `bigint` count of minor units (cents), kept
inside the signed 64-bit range that Postgres `BIGINT` and C# `long` share. The
arithmetic is exact, and every language on the wire agrees on the edges.

It covers ISO 4217 exponents, strict parsing, locale-free formatting, five rounding
modes, exact allocation, currency conversion, a canonical wire codec, and a checked
WebAssembly fold for the hot summation path.

## Usage

```ts
import { amount, add, compare } from '@pwngh/money';

const a = amount('USD', 500n); // $5.00, as 500 minor units
const b = amount('USD', 250n);

add(a, b); // amount('USD', 750n)
compare(a, b); // 1
```

Three single-file amalgamations ship independently — the semantic layer at `.`, the
fold at `./fold`, the database carrier at `./db` — each carrying its own conformance
vectors and a `selfTest()`, so any copy in any runtime can prove itself. Zero
runtime dependencies, no binary in the tree.

## Documentation

Guides in [docs/](docs/README.md): getting started, vendoring, the fold, the
database carrier, and porting to other languages.

## License

MIT © Preston Neal — see [LICENSE.md](LICENSE.md).
