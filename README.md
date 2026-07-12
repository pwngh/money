# @pwngh/money

Minor-unit integer money for TypeScript. An amount is a currency code plus a
`bigint` count of minor units (cents), checked into the signed 64-bit range that
Postgres `BIGINT` and C# `long` share, so arithmetic is exact and every carrier
agrees on the edges. The package covers ISO 4217 exponents, strict parsing,
locale-free formatting, five explicit rounding modes, exact allocation, rational
currency conversion, a canonical wire codec, and a checked WebAssembly fold for
the hot summation path.

Everything ships as three independent single-file amalgamations — the semantic
layer at `.`, the fold at `./fold`, the database carrier at `./db` — each with
its conformance vectors and a `selfTest()` embedded, so any copy in any runtime
proves itself. Zero runtime dependencies, no binary in the tree.

## Documentation

Consumer guides live in [docs/](docs/README.md): getting started, vendoring, the
fold, the database carrier, and porting to other languages.

## License

MIT © Preston Neal — see [LICENSE.md](LICENSE.md).
